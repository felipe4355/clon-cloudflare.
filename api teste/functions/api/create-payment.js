const API = 'https://api.velanipagamentos.com.br/api/v1/api-gateway';

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const key = env.VELANI_SECRET_KEY;
  if (!key) return Response.json({ error: 'Integração PIX ainda não configurada.' }, { status: 500, headers });

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Dados inválidos.' }, { status: 400, headers });
  }

  const { name, email, phone, cpf } = body || {};
  const cleanCpf = String(cpf || '').replace(/\D/g, '');
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (typeof name !== 'string' || name.trim().length < 3 ||
      typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) ||
      cleanPhone.length < 10 || cleanCpf.length !== 11) {
    return Response.json({ error: 'Confira nome, e-mail, telefone e CPF.' }, { status: 400, headers });
  }

  try {
    const upstream = await fetch(API + '/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'x-idempotency-key': crypto.randomUUID()
      },
      body: JSON.stringify({
        amount: 2865,
        paymentMethod: 'pix',
        description: 'Acesso à videoaula educativa sobre score de crédito',
        customer: {
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone,
          document: { type: 'cpf', number: cleanCpf }
        },
        items: [{ title: 'Videoaula educativa — Score de crédito', unitPrice: 2865, quantity: 1 }]
      })
    });
    const data = await upstream.json();
    if (!upstream.ok || !data.success || !data.data?.id) {
      return Response.json(
        { error: data?.error?.message || 'A operadora não conseguiu gerar a cobrança.' },
        { status: upstream.status || 502, headers }
      );
    }
    return Response.json({
      transactionId: data.data.id,
      pixCode: data.data.pixQrCode || '',
      pixImage: data.data.pixQrCodeImage || '',
      status: data.data.status || 'pending'
    }, { status: 200, headers });
  } catch {
    return Response.json({ error: 'Falha ao comunicar com o serviço de pagamento.' }, { status: 502, headers });
  }
}
