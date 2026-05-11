// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  try {
    // CORS Header
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Get Instagram Token
    const { data: tokenData, error: tokenError } = await supabase
      .from('social_tokens')
      .select('access_token')
      .eq('campaign_id', campaign_id)
      .eq('provider', 'meta')
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: 'Instagram não conectado para esta campanha' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch Instagram User ID (using the token)
    // For simplicity, we assume the token is a Page Access Token that has access to the IG Business Account
    // In a real flow, you'd first get the Me account, then the Pages, then the IG ID.
    // Here we'll try to fetch the IG Business Account linked to the Page.
    
    // FETCH MEDIA (Recent Posts)
    // We'll use the Graph API: GET /me/media?fields=id,caption,timestamp,comments_count
    const mediaResponse = await fetch(`https://graph.facebook.com/v19.0/me/media?fields=id,caption,timestamp,comments_count&access_token=${accessToken}`);
    const mediaData = await mediaResponse.json();

    if (mediaData.error) {
      throw new Error(mediaData.error.message);
    }

    const posts = mediaData.data || [];
    const rankingMap: Record<string, { count: number, lastComment: string }> = {};

    // 3. Fetch Comments for each post
    // Limit to top 10 posts for performance in the edge function
    for (const post of posts.slice(0, 10)) {
      if (post.comments_count > 0) {
        const commentsResponse = await fetch(`https://graph.facebook.com/v19.0/${post.id}/comments?fields=from,text,timestamp&access_token=${accessToken}`);
        const commentsData = await commentsResponse.json();
        
        if (commentsData.data) {
          for (const comment of commentsData.data) {
            const username = comment.from?.username || 'usuario_privado';
            if (!rankingMap[username]) {
              rankingMap[username] = { count: 0, lastComment: '' };
            }
            rankingMap[username].count += 1;
            rankingMap[username].lastComment = comment.text;
          }
        }
      }
    }

    // 4. Format and Sort Ranking
    const ranking = Object.entries(rankingMap)
      .map(([username, data]) => ({
        username,
        count: data.count,
        lastComment: data.lastComment
      }))
      .sort((a, b) => b.count - a.count);

    return new Response(JSON.stringify({ ranking }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[instagram-ranking] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json' 
      }
    });
  }
});
