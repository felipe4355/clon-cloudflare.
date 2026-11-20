const API='https://api.velanipagamentos.com.br/api/v1/api-gateway';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  const key=process.env.VELANI_SECRET_KEY;if(!key)return res.status(500).json({error:'Integração PIX ainda não configurada.'});
  const {name,email,phone,cpf}=req.body||{};
  const cleanCpf=String(cpf||'').replace(/\D/g,'');
  if(typeof name!=='string'||name.trim().length<3||typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||String(phone||'').replace(/\D/g,'').length<10||cleanCpf.length!==11)return res.status(400).json({error:'Confira nome, e-mail, telefone e CPF.'});
  try{
    const upstream=await fetch(API+'/v1/transactions',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'x-idempotency-key':require('crypto').randomUUID()},body:JSON.stringify({amount:2865,paymentMethod:'pix',description:'Acesso à videoaula educativa sobre score de crédito',customer:{name:name.trim(),email:email.trim(),phone:String(phone).replace(/\D/g,''),document:{type:'cpf',number:cleanCpf}},items:[{title:'Videoaula educativa — Score de crédito',unitPrice:2865,quantity:1}]})});
    const data=await upstream.json();if(!upstream.ok||!data.success||!data.data?.id)return res.status(upstream.status||502).json({error:data?.error?.message||'A operadora não conseguiu gerar a cobrança.'});
    return res.status(200).json({transactionId:data.data.id,pixCode:data.data.pixQrCode||'',pixImage:data.data.pixQrCodeImage||'',status:data.data.status||'pending'});
  }catch(e){return res.status(502).json({error:'Falha ao comunicar com o serviço de pagamento.'})}
};