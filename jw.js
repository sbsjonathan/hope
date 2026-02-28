<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lousa com Modal Minimalista</title>
<style>
/* Estilos Base */
body { margin:0; background:#0b0f14; color:#e8edf3; font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial; }
.lousa { max-width:760px; margin:24px auto; padding:18px 16px; background:#101826; border:2px solid #2a3a52; border-radius:14px; }
a { color:#8ad0ff; text-decoration:none; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;}
a:hover { text-decoration:underline; }

/* Modal */
.modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.8); align-items:center; justify-content:center; padding: 20px; z-index: 999; }
.modal-content { width:100%; max-width: 800px; height:85vh; background:#fff; border-radius:12px; position:relative; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);}
.fechar { position:absolute; top:12px; right:16px; font-size:28px; cursor:pointer; color:#555; font-weight: bold; line-height: 1; z-index: 10; background: #fff; border-radius: 50%; width: 30px; height: 30px; text-align: center; border: 1px solid #ccc;}
.fechar:hover { color:#000; background: #eee; }

/* Container do Artigo */
#article-container { padding: 40px 30px; overflow-y: auto; color: #1a1a1a; font-family: Georgia, serif; font-size: 18px; line-height: 1.8; flex: 1; }
#article-container img { max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; }
#article-container h1, #article-container h2 { color: #222; font-family: -apple-system, sans-serif; }
#article-container a { color: #0056b3; }

/* Estado de Carregamento (SVG) */
.loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #555; font-family: sans-serif; }
.loading svg { width: 60px; height: 60px; fill: #8ad0ff; animation: pulse 1.5s infinite; margin-bottom: 15px; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
</style>
</head>
<body>

<main class="lousa">
<p>
Para ver mais princípios relacionados a esse assunto, baixe e leia a 
<a onclick="abrirModal('https://jw.org/pt/biblioteca/revistas/w20020515/Perguntas-dos-Leitores/')">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
  Sentinela de 15 de maio de 2002
</a>
e a 
<a onclick="abrirModal('https://jw.org/pt/biblioteca/revistas/w20071115/Perguntas-dos-Leitores/')">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
  Sentinela de 15 de novembro de 2007
</a>.
</p>
</main>

<div class="modal" id="modal">
  <div class="modal-content">
    <span class="fechar" onclick="fecharModal()">×</span>
    <div id="article-container"></div>
  </div>
</div>

<script>
// COLOQUE A URL DO SEU NOVO WORKER AQUI
const PROXY = "https://hope.momentaneo2021.workers.dev/";

const loadingHTML = `
  <div class="loading">
    <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
    <span>Extraindo artigo...</span>
  </div>
`;

async function abrirModal(url) {
  const modal = document.getElementById('modal');
  const container = document.getElementById('article-container');
  
  modal.style.display = 'flex';
  container.innerHTML = loadingHTML; // Mostra o SVG piscando

  try {
    const resposta = await fetch(PROXY + "?url=" + encodeURIComponent(url));
    if (!resposta.ok) throw new Error("Erro ao buscar artigo");
    
    const htmlExtraido = await resposta.text();
    container.innerHTML = htmlExtraido; // Voilà! O artigo aparece puro.
    container.scrollTop = 0; // Joga a barra de rolagem pra cima
  } catch (erro) {
    container.innerHTML = `<div style="text-align:center; color:red; margin-top:50px;">Erro ao carregar o artigo. Tente novamente.</div>`;
  }
}

function fecharModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('article-container').innerHTML = '';
}
</script>

</body>
</html>