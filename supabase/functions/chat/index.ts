import { GoogleGenAI } from 'npm:@google/genai';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  chatRequestSchema,
  buildSystemInstruction,
  formatGeminiContents,
  deriveConversationTitle,
  encodeSSE,
} from './lib.ts';

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

function getCorsHeaders(req: Request): Record<string, string> {
  const allowed = (
    Deno.env.get('ALLOWED_ORIGINS') ?? 'https://nguyen-ha-an.github.io,http://localhost:5173'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get('Origin') ?? '';
  const matched = allowed.includes(origin) ? origin : allowed[0] ?? '*';

  return {
    'Access-Control-Allow-Origin': matched,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // 1. OPTIONS -> 204
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Require Authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. User-scoped Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 4. Parse & validate request body
  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const parsed = chatRequestSchema.safeParse(bodyJson);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message ?? 'invalid_request';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { conversationId, message, attachNoteIds, includeToday } = parsed.data;

  // 5. Consume AI quota
  const quotaLimit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 50);
  const { error: quotaError } = await supabase.rpc('consume_ai_quota', {
    p_limit: quotaLimit,
  });

  if (quotaError) {
    return new Response(JSON.stringify({ error: 'ai_quota_exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 6. Verify conversation belongs to user (select via RLS) -> 404
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, title, user_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (convError || !conv) {
    return new Response(JSON.stringify({ error: 'conversation_not_found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 7. Load last 20 messages ordered ascending
  const { data: rawMessages, error: msgsError } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (msgsError) {
    return new Response(JSON.stringify({ error: 'failed_to_load_messages' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const history = (rawMessages ?? []).slice().reverse();

  // 8. Build context blocks (todos, sessions, notes)
  let todos: { title: string; due_date: string | null }[] | undefined;
  let sessionStats: { sessionCount: number; totalFocusedMinutes: number } | undefined;

  if (includeToday) {
    const { data: openTodos } = await supabase
      .from('todos')
      .select('title, due_date')
      .eq('done', false)
      .order('position', { ascending: true })
      .limit(50);
    todos = openTodos ?? [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSessions } = await supabase
      .from('focus_sessions')
      .select('focused_seconds')
      .gte('started_at', sevenDaysAgo);

    const count = recentSessions?.length ?? 0;
    const totalSeconds = (recentSessions ?? []).reduce(
      (acc, s) => acc + (s.focused_seconds ?? 0),
      0,
    );
    sessionStats = {
      sessionCount: count,
      totalFocusedMinutes: Math.floor(totalSeconds / 60),
    };
  }

  let attachedNotes: { id: string; title: string; content_text: string }[] | undefined;
  if (attachNoteIds && attachNoteIds.length > 0) {
    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, content_text')
      .in('id', attachNoteIds.slice(0, 5));
    attachedNotes = notes ?? [];
  }

  const systemInstruction = buildSystemInstruction({
    includeToday,
    todos,
    sessionStats,
    attachedNotes,
  });

  const contents = formatGeminiContents(history, message);

  // 9. Stream response with SSE
  const isFake = Deno.env.get('CHAT_FAKE_MODEL') === '1';

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(encodeSSE(data)));
      };

      let fullText = '';
      try {
        if (isFake) {
          send({ delta: 'Echo: ' });
          fullText += 'Echo: ';
          send({ delta: message });
          fullText += message;
        } else {
          const apiKey = Deno.env.get('GEMINI_API_KEY');
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY missing');
          }

          const ai = new GoogleGenAI({ apiKey });
          const modelName = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
          const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents,
            config: { systemInstruction },
          });

          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              send({ delta: text });
              fullText += text;
            }
          }
        }

        // Insert user message then assistant message (user-scoped client)
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'user',
          content: message,
        });

        const { data: assistantMsg, error: asstErr } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: 'assistant',
            content: fullText,
          })
          .select('id')
          .single();

        if (asstErr || !assistantMsg) {
          throw asstErr ?? new Error('failed_to_save_assistant_message');
        }

        // If conversation title is 'New chat' set it to the first 60 chars of the user message
        const newTitle = deriveConversationTitle(conv.title, message);
        if (newTitle) {
          await supabase
            .from('conversations')
            .update({ title: newTitle })
            .eq('id', conversationId);
        }

        send({ done: true, messageId: assistantMsg.id });
      } catch (_err) {
        // On Gemini error send data: {"error": "upstream_error"} and persist nothing
        send({ error: 'upstream_error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
});
