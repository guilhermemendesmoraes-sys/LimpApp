const CACHE_NAME = 'limpapp-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
let textoUltimoAlerta = "";
let laudoAtual = ""; 
let historicoTestes = [];

const bancoQuimico = {
    "agua_sanitaria": { nome: "Hipoclorito de Sódio", formula: "NaClO", classe: "Oxidante Forte", ph: 12.5 },
    "vinagre": { nome: "Ácido Acético", formula: "CH₃COOH", classe: "Ácido Fraco", ph: 2.5 },
    "amonia": { nome: "Hidróxido de Amônio", formula: "NH₄OH", classe: "Base", ph: 11.5 },
    "alcool": { nome: "Etanol", formula: "C₂H₅OH", classe: "Solvente Orgânico", ph: 7.0 },
    "detergente": { nome: "Tensoativos Aniônicos", formula: "Mistura Sintética", classe: "Agente Neutro", ph: 7.0 },
    "agua_oxigenada": { nome: "Peróxido de Hidrogênio", formula: "H₂O₂", classe: "Agente Oxidante", ph: 4.5 },
    "bicarbonato": { nome: "Bicarbonato de Sódio", formula: "NaHCO₃", classe: "Sal Alcalino", ph: 8.3 },
    "desinfetante_pinho": { nome: "Óleos de Pinho", formula: "Compostos Aromáticos", classe: "Desinfetante", ph: 6.0 },
    "soda_caustica": { nome: "Hidróxido de Sódio", formula: "NaOH", classe: "Base Forte", ph: 14.0 },
    "sabao_po": { nome: "Alquilbenzeno Sulfonato", formula: "Mistura Alcalina", classe: "Detergente Alcalino", ph: 10.0 },
    "removedor_ferrugem": { nome: "Ácido Oxálico", formula: "H₂C₂O₄", classe: "Ácido Forte", ph: 1.5 },
    "acetona": { nome: "Propanona", formula: "C₃H₆O", classe: "Solvente Volátil", ph: 7.0 },
    "desengordurante": { nome: "Solventes + Alcalinizantes", formula: "Mistura Solúvel", classe: "Desengraxante", ph: 11.0 },
    "limpador_aluminio": { nome: "Ácido Sulfúrico", formula: "H₂SO₄", classe: "Ácido Corrosivo", ph: 1.0 },
    "querosene": { nome: "Hidrocarbonetos Alifáticos", formula: "CnH2n+2", classe: "Solvente", ph: 7.0 },
    "alcool_isopropilico": { nome: "Isopropanol", formula: "C₃H₈O", classe: "Solvente Orgânico", ph: 7.0 }
};

function classificarPH(valor) {
    if (valor < 6) return "ph-acido";
    if (valor > 8) return "ph-alcalino";
    return "ph-neutro";
}

function falarTexto(mensagem) {
    window.speechSynthesis.cancel();
    const falar = new SpeechSynthesisUtterance(mensagem);
    const vozes = window.speechSynthesis.getVoices();
    const vozPtBr = vozes.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
    if (vozPtBr) { falar.voice = vozPtBr; }
    falar.lang = 'pt-BR';
    falar.rate = 0.9;
    window.speechSynthesis.speak(falar);
}

window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };

function calcularMistura() {
    const elA = document.getElementById('produtoA');
    const elB = document.getElementById('produtoB');
    const pA = elA.value;
    const pB = elB.value;

    if (!pA && !pB) { 
        atualizarInterface("estado-espera", "🔬", "Aguardando Parâmetros", "Insira os dois compostos químicos no painel acima para iniciar o mapeamento molecular de riscos e reações.", []);
        document.getElementById('dadosQuimicos').style.display = "none";
        return; 
    }

    if (!pA || !pB) {
        let nomeSelecionado = pA ? elA.options[elA.selectedIndex].text : elB.options[elB.selectedIndex].text;
        atualizarInterface("estado-espera", "⏳", "Aguardando 2º Produto", `Você selecionou: ${nomeSelecionado}. Agora escolha o outro componente químico para processar a análise.`, []);
        document.getElementById('dadosQuimicos').style.display = "none";
        return;
    }

    const nomeA = elA.options[elA.selectedIndex].text;
    const nomeB = elB.options[elB.selectedIndex].text;

    const dadosA = { 
        nomeForm: `${bancoQuimico[pA].nome} (${bancoQuimico[pA].formula})`, 
        classe: bancoQuimico[pA].classe, 
        ph: bancoQuimico[pA].ph,
        classePh: classificarPH(bancoQuimico[pA].ph)
    };
    
    const dadosB = { 
        nomeForm: `${bancoQuimico[pB].nome} (${bancoQuimico[pB].formula})`, 
        classe: bancoQuimico[pB].classe, 
        ph: bancoQuimico[pB].ph,
        classePh: classificarPH(bancoQuimico[pB].ph)
    };

    if (pA === pB) {
        const tit = "Mistura Estável (Mesmo Produto)";
        const desc = "A união de recipientes do mesmo composto não altera as propriedades moleculares primárias.";
        atualizarInterface("seguro", "✓", tit, desc, ["Luvas de Proteção"], dadosA, dadosB, "", "Nenhum impacto biológico adverso além dos já previstos no rótulo.");
        adicionarAoHistorico(nomeA, nomeB, "seguro", tit);
        prepararTexto(tit, desc);
        return;
    }

    const combinacao = [pA, pB].sort().join('_+_');
    let tipo = "seguro", icone = "✓", titulo = "", descricao = "", epis = [], acao = "", sintomas = "";

    switch(combinacao) {
        case "agua_sanitaria_+_querosene":
        case "agua_sanitaria_+_limpador_aluminio":
        case "agua_sanitaria_+_removedor_ferrugem":
        case "agua_sanitaria_+_amonia":
        case "agua_sanitaria_+_vinagre":
            tipo = "perigo"; icone = "☣️";
            titulo = "Perigo Crítico: Gás Tóxico";
            descricao = "Esta combinação quebra a estabilidade das moléculas, liberando nuvens de gases pesados que atacam as mucosas.";
            sintomas = "Tosse severa, lacrimejamento imediato, sensação de asfixia e risco de edema pulmonar agudo (líquido no pulmão).";
            epis = ["Máscara Respiratória", "Óculos de Proteção", "Luvas Nitrílicas"];
            acao = "Evacue o local imediatamente. Procure ar fresco.";
            break;

        case "agua_sanitaria_+_sabao_po":
            tipo = "perigo"; icone = "☣️";
            titulo = "Perigo: Cloramina e Inativação";
            descricao = "O hipoclorito reage com compostos do sabão em pó, anulando a limpeza de ambos e liberando gás cloramina tóxico.";
            sintomas = "Ardência imediata nos olhos, nariz e garganta, tosse severa e risco de problemas respiratórios agudos.";
            epis = ["Máscara Respiratória", "Ambiente Bem Ventilado"];
            acao = "Não permaneça no ambiente fechado com a mistura. Abra janelas e portas.";
            break;

        case "agua_oxigenada_+_vinagre":
        case "limpador_aluminio_+_soda_caustica":
        case "removedor_ferrugem_+_soda_caustica":
        case "soda_caustica_+_vinagre":
            tipo = "perigo"; icone = "🌋";
            titulo = "Perigo: Reação Exotérmica / Corrosão";
            descricao = "Misturar ácidos com bases fortes gera calor instantâneo (fervura) e cria soluções extremamente corrosivas.";
            sintomas = "Queimaduras químicas de 2º ou 3º grau na pele, necrose de tecido e cegueira permanente se houver contato ocular.";
            epis = ["Protetor Facial", "Luvas de Borracha Grossas", "Avental de PVC"];
            acao = "Se respingar, lave a pele com água corrente por 15 a 20 minutos ininterruptos.";
            break;

        case "acetona_+_agua_sanitaria":
        case "agua_sanitaria_+_alcool":
        case "agua_sanitaria_+_alcool_isopropilico":
            tipo = "perigo"; icone = "🛑";
            titulo = "Perigo: Clorofórmio / Halofórmio";
            descricao = "O cloro ativo ataca o solvente e cria vapores que deprimem o sistema nervoso central.";
            sintomas = "Tontura progressiva, náuseas, confusão mental, síncope (desmaio) e depressão respiratória.";
            epis = ["Óculos de Proteção", "Luvas Nitrílicas", "Máscara de Carvão"];
            acao = "Ao primeiro sinal de enjoo, saia do recinto.";
            break;

        case "bicarbonato_+_vinagre":
        case "bicarbonato_+_limpador_aluminio":
        case "bicarbonato_+_removedor_ferrugem":
            tipo = "atencao"; icone = "⚠️";
            titulo = "Atenção: Pressão por Gás";
            descricao = "Neutralização rápida com liberação de gás carbônico (CO2). Pode causar explosão física de frascos fechados.";
            sintomas = "Risco de lesões físicas causadas por estilhaços de embalagens rompidas pela pressão.";
            epis = ["Luvas de Proteção"];
            acao = "Nunca feche o recipiente enquanto estiver borbulhando.";
            break;

        case "acetona_+_alcool":
        case "acetona_+_querosene":
        case "alcool_+_querosene":
        case "alcool_isopropilico_+_querosene":
            tipo = "atencao"; icone = "🔥";
            titulo = "Atenção: Alta Inflamabilidade";
            descricao = "Misturar solventes evapora rápido e o gás invisível pode inflamar com uma faísca simples.";
            sintomas = "Risco severo de queimaduras térmicas por explosão ambiental. Irritação leve nas vias aéreas.";
            epis = ["Luvas Nitrílicas", "Ambiente Super Ventilado"];
            acao = "Mantenha rigorosamente longe de fontes de ignição (calor, isqueiros, tomadas).";
            break;

        case "alcool_+_vinagre":
        case "agua_sanitaria_+_detergente":
        case "desengordurante_+_sabao_po":
        case "detergente_+_vinagre":
            titulo = "Combinação Segura";
            descricao = "As moléculas são compatíveis. O uso é seguro para limpezas rotineiras.";
            sintomas = "Nenhum agravo à saúde, exceto possível ressecamento da epiderme por uso prolongado.";
            epis = ["Luvas de Látex Básicas"];
            break;

        default:
            titulo = "Compatibilidade Genérica";
            descricao = "Nenhum histórico de colisão molecular perigosa detectado no sistema.";
            sintomas = "Efeitos biológicos limitados aos já descritos nos rótulos individuais dos produtos.";
            epis = ["Luvas de Proteção"];
    }

    atualizarInterface(tipo, icone, titulo, descricao, epis, dadosA, dadosB, acao, sintomas);
    adicionarAoHistorico(nomeA, nomeB, tipo, titulo);
    prepararTexto(titulo, descricao);
    
    // Atualizado para LimpApp
    laudoAtual = `🧪 LimpApp - Relatório de Mistura\n\nReagentes:\n1. ${nomeA} [pH: ${dadosA.ph}]\n2. ${nomeB} [pH: ${dadosB.ph}]\n\n⚠️ Status: ${titulo}\n🔬 Análise: ${descricao}\n🦠 Sintomas: ${sintomas}\n\n🛡️ EPIs Necessários: ${epis.join(", ")}`;
}

function atualizarInterface(classeEstilo, icone, titulo, descricao, epis, dadoA = null, dadoB = null, acao = "", sintomas = "") {
    const quadro = document.getElementById('quadroResultado');
    const divDados = document.getElementById('dadosQuimicos');
    const divAcao = document.getElementById('alertaAcao');
    const divSintomas = document.getElementById('blocoSintomas');
    
    const ativos = classeEstilo !== "estado-espera";
    document.getElementById('btnOuvir').style.display = ativos ? "inline-block" : "none";
    document.getElementById('btnCopiar').style.display = ativos ? "inline-block" : "none";
    document.getElementById('btnRelatorio').style.display = ativos ? "inline-block" : "none";
    
    if (dadoA && dadoB) {
        divDados.style.display = "flex";
        document.getElementById('nomeCientificoA').innerText = dadoA.nomeForm;
        document.getElementById('classeA').innerText = dadoA.classe;
        
        let elPhA = document.getElementById('phA');
        elPhA.innerText = `pH ~${dadoA.ph}`;
        elPhA.className = `badge-ph ${dadoA.classePh}`;

        document.getElementById('nomeCientificoB').innerText = dadoB.nomeForm;
        document.getElementById('classeB').innerText = dadoB.classe;
        
        let elPhB = document.getElementById('phB');
        elPhB.innerText = `pH ~${dadoB.ph}`;
        elPhB.className = `badge-ph ${dadoB.classePh}`;
    } else {
        divDados.style.display = "none";
    }

    if (sintomas !== "") {
        divSintomas.style.display = "block";
        document.getElementById('textoSintomas').innerText = sintomas;
    } else {
        divSintomas.style.display = "none";
    }

    if (acao !== "") {
        divAcao.style.display = "block";
        document.getElementById('textoAcao').innerText = acao;
    } else {
        divAcao.style.display = "none";
    }

    quadro.className = `resultado-card ${classeEstilo}`;
    document.getElementById('resultadoIcone').innerText = icone;
    document.getElementById('statusTitulo').innerText = titulo;
    document.getElementById('statusDescricao').innerText = descricao;

    const listaEpis = document.getElementById('listaEpis');
    listaEpis.innerHTML = "";
    if (epis.length > 0) {
        document.getElementById('blocoEpis').style.display = "block";
        epis.forEach(epi => {
            const span = document.createElement('span');
            span.className = "epi-item";
            span.innerHTML = `🛡️ ${epi}`;
            listaEpis.appendChild(span);
        });
    } else {
        document.getElementById('blocoEpis').style.display = "none";
    }
}

function prepararTexto(titulo, descricao) {
    textoUltimoAlerta = `${titulo}. ... Análise técnica do sistema: ... ${descricao}`;
}

function lerAnalise() {
    if (textoUltimoAlerta) { falarTexto(textoUltimoAlerta); }
}

function copiarResumo() {
    if(laudoAtual) {
        navigator.clipboard.writeText(laudoAtual).then(() => {
            alert("✅ Laudo químico copiado com sucesso!");
        });
    }
}

function exportarDados() {
    if (historicoTestes.length === 0) {
        alert("⚠️ Faça pelo menos uma simulação antes de exportar o diário.");
        return;
    }
    
    // Atualizado para LimpApp
    let conteudo = "--- DIÁRIO DE TESTES: LIMPAPP ---\n\n";
    historicoTestes.forEach((teste, index) => {
        conteudo += `Teste #${index + 1}\n`;
        conteudo += `Reagentes: ${teste.p1} + ${teste.p2}\n`;
        conteudo += `Resultado: ${teste.resultado}\n`;
        conteudo += `Data/Hora: ${teste.hora}\n\n`;
    });

    const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Diario_LimpApp.txt"; // Atualizado para LimpApp
    link.click();
    URL.revokeObjectURL(url);
}

function resetarSimulador() {
    document.getElementById('produtoA').value = "";
    document.getElementById('produtoB').value = "";
    textoUltimoAlerta = "";
    laudoAtual = "";
    window.speechSynthesis.cancel();
    atualizarInterface("estado-espera", "🔬", "Aguardando Parâmetros", "Insira os dois compostos químicos no painel acima para iniciar o mapeamento molecular de riscos e reações.", []);
}

function adicionarAoHistorico(prod1, prod2, tipo, titulo) {
    const agora = new Date().toLocaleTimeString();
    historicoTestes.push({ p1: prod1, p2: prod2, resultado: titulo, hora: agora });

    const lista = document.getElementById('listaHistorico');
    const vazio = lista.querySelector('.historico-vazio');
    if (vazio) vazio.remove();
    
    const item = document.createElement('div');
    item.className = `historico-item p-${tipo}`;
    item.innerHTML = `<strong>${prod1}</strong> + <strong>${prod2}</strong>`;
    lista.insertBefore(item, lista.firstChild);
    if (lista.children.length > 5) { lista.removeChild(lista.lastChild); }
}