const API = 'https://api.velanipagamentos.com.br/api/v1/api-gateway';

export async function onRequestGet({ request, env }) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const key = env.VELANI_SECRET_KEY;
  if (!key) return Response.json({ error: 'Integração PIX não configurada.' }, { status: 500, headers });

  const url = new URL(request.url);
  const id = String(url.searchParams.get('id') || '');
  if (!/^[0-9a-f-]{20,}$/i.test(id)) {
    return Response.json({ error: 'Identificador inválido.' }, { status: 400, headers });
  }

  try {
    const response = await fetch(API + '/v1/transactions/' + encodeURIComponent(id), {
      headers: { 'x-api-key': key }
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      return Response.json({ error: 'Não foi possível consultar o pagamento.' }, {
        status: response.status || 502, headers
      });
    }
    const status = String(data.data?.status || 'pending').toLowerCase();
    const videoUrl = env.VIDEO_URL || '';
    return Response.json({
      status,
      videoUrl: status === 'paid' && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(videoUrl) ? videoUrl : ''
    }, { status: 200, headers });
  } catch {
    return Response.json({ error: 'Falha ao consultar o pagamento.' }, { status: 502, headers });
  }
}
