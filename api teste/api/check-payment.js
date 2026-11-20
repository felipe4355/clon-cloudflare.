const API='https://api.velanipagamentos.com.br/api/v1/api-gateway';
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
  const key=process.env.VELANI_SECRET_KEY;if(!key)return res.status(500).json({error:'Integração PIX não configurada.'});
  const id=String(req.query.id||'');if(!/^[0-9a-f-]{20,}$/i.test(id))return res.status(400).json({error:'Identificador inválido.'});
  try{const r=await fetch(API+'/v1/transactions/'+encodeURIComponent(id),{headers:{'x-api-key':key}});const j=await r.json();if(!r.ok||!j.success)return res.status(r.status||502).json({error:'Não foi possível consultar o pagamento.'});
    const status=String(j.data?.status||'pending').toLowerCase();const videoUrl=process.env.VIDEO_URL||'';
    return res.status(200).json({status,videoUrl:status==='paid'&&/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(videoUrl)?videoUrl:''});
  }catch(e){return res.status(502).json({error:'Falha ao consultar o pagamento.'})}
};