let textoUltimoAlerta = "";
let laudoAtual = "";
let historicoTestes = [];

const API_BASE = "http://127.0.0.1:8000/api";

// Executa automaticamente ao carregar a página para alimentar as opções do select vinda do SQL
window.addEventListener("DOMContentLoaded", () => {
    carregarProdutosDoBanco();
});

function carregarProdutosDoBanco() {
    fetch(`${API_BASE}/produtos`)
        .then(response => response.json())
        .then(produtos => {
            const elA = document.getElementById("produtoA");
            const elB = document.getElementById("produtoB");

            const placeholder = '<option value="">Selecione um produto...</option>';
            elA.innerHTML = placeholder;
            elB.innerHTML = placeholder;

            produtos.forEach(p => {
                const opt = `<option value="${p.id}">${p.nome}</option>`;
                elA.innerHTML += opt;
                elB.innerHTML += opt;
            });
        })
        .catch(err => {
            console.error("Falha ao comunicar com a API do LimpApp:", err);
            document.getElementById("produtoA").innerHTML = '<option value="">Erro ao carregar banco.</option>';
            document.getElementById("produtoB").innerHTML = '<option value="">Erro ao carregar banco.</option>';
        });
}

function calcularMistura() {
    const elA = document.getElementById("produtoA");
    const elB = document.getElementById("produtoB");
    const pA = elA.value;
    const pB = elB.value;

    if (!pA && !pB) {
        atualizarInterface("estado-espera", "🔬", "Aguardando Parâmetros", "Insira os dois compostos químicos no painel acima para iniciar o mapeamento molecular de riscos e reações.", []);
        document.getElementById("dadosQuimicos").style.display = "none";
        return;
    }

    if (!pA || !pB) {
        let nomeSelecionado = pA ? elA.options[elA.selectedIndex].text : elB.options[elB.selectedIndex].text;
        atualizarInterface("estado-espera", "⏳", "Aguardando 2º Produto", `Você pré-selecionou: ${nomeSelecionado}. Forneça o segundo composto para fechamento da análise.`, []);
        document.getElementById("dadosQuimicos").style.display = "none";
        return;
    }

    const nomeA = elA.options[elA.selectedIndex].text;
    const nomeB = elB.options[elB.selectedIndex].text;

    // Dispara a consulta na matriz de reações do banco SQLite através do Python
    fetch(`${API_BASE}/analisar?pA=${pA}&pB=${pB}`)
        .then(response => response.json())
        .then(data => {
            const dadosAFormatados = {
                nomeForm: `${data.dadosA.nome} (${data.dadosA.formula})`,
                classe: data.dadosA.classe,
                ph: data.dadosA.ph,
                classePh: classificarPH(data.dadosA.ph)
            };

            const dadosBFormatados = {
                nomeForm: `${data.dadosB.nome} (${data.dadosB.formula})`,
                classe: data.dadosB.classe,
                ph: data.dadosB.ph,
                classePh: classificarPH(data.dadosB.ph)
            };

            const listaEpis = data.epis ? data.epis.split(", ") : [];

            atualizarInterface(data.tipo, data.icone, data.titulo, data.descricao, listaEpis, dadosAFormatados, dadosBFormatados, data.acao, data.sintomas);
            adicionarAoHistorico(nomeA, nomeB, data.tipo, data.titulo);
            
            textoUltimoAlerta = `${data.titulo}. ${data.descricao}`;
            laudoAtual = `🧪 LimpApp - Relatório Técnico de Compatibilidade\n\nReagentes:\n1. ${dadosAFormatados.nomeForm} [pH: ${data.dadosA.ph}]\n2. ${dadosBFormatados.nomeForm} [pH: ${data.dadosB.ph}]\n\n⚠️ Resultado: ${data.titulo}\n🔬 Descrição: ${data.descricao}\n🦠 Sintomas: ${data.sintomas || "Nenhum"}\n🛡️ EPIs Recomendados: ${data.epis || "Nenhum"}`;
        })
        .catch(err => console.error("Erro ao analisar mistura:", err));
}

function classificarPH(ph) {
    if (ph < 5.0) return "ph-acido";
    if (ph > 8.5) return "ph-alcalino";
    return "ph-neutro";
}

function atualizarInterface(tipo, icone, titulo, descricao, epis, dadosA = null, dadosB = null, acao = "", sintomas = "") {
    const card = document.getElementById("quadroResultado");
    card.className = `resultado-card ${tipo}`;

    document.getElementById("resultadoIcone").innerText = icone;
    document.getElementById("statusTitulo").innerText = titulo;
    document.getElementById("statusDescricao").innerText = descricao;

    const divDados = document.getElementById("dadosQuimicos");
    if (dadosA && dadosB) {
        divDados.style.display = "flex";
        document.getElementById("nomeCientificoA").innerText = dadosA.nomeForm;
        document.getElementById("classeA").innerText = dadosA.classe;
        document.getElementById("phA").innerText = `pH ${dadosA.ph}`;
        document.getElementById("phA").className = `badge-ph ${dadosA.classePh}`;

        document.getElementById("nomeCientificoB").innerText = dadosB.nomeForm;
        document.getElementById("classeB").innerText = dadosB.classe;
        document.getElementById("phB").innerText = `pH ${dadosB.ph}`;
        document.getElementById("phB").className = `badge-ph ${dadosB.classePh}`;
    } else {
        divDados.style.display = "none";
    }

    const blocoSintomas = document.getElementById("blocoSintomas");
    if (sintomas) {
        blocoSintomas.style.display = "block";
        document.getElementById("textoSintomas").innerText = sintomas;
    } else {
        blocoSintomas.style.display = "none";
    }

    const blocoAcao = document.getElementById("alertaAcao");
    if (acao) {
        blocoAcao.style.display = "block";
        document.getElementById("textoAcao").innerText = acao;
    } else {
        blocoAcao.style.display = "none";
    }

    const botoesEmergencia = document.getElementById("botoesEmergencia");
    botoesEmergencia.style.display = tipo === "perigo" ? "flex" : "none";

    const blocoEpis = document.getElementById("blocoEpis");
    const listaEpis = document.getElementById("listaEpis");
    listaEpis.innerHTML = "";
    if (epis.length > 0) {
        blocoEpis.style.display = "block";
        epis.forEach(epi => {
            listaEpis.innerHTML += `<span class="epi-item">🛡️ ${epi}</span>`;
        });
    } else {
        blocoEpis.style.display = "none";
    }

    const visivel = tipo !== "estado-espera";
    document.getElementById("btnOuvir").style.display = visivel ? "inline-block" : "none";
    document.getElementById("btnCopiar").style.display = visivel ? "inline-block" : "none";
    document.getElementById("btnRelatorio").style.display = visivel ? "inline-block" : "none";
}

function adicionarAoHistorico(prodA, prodB, tipo, titulo) {
    const lista = document.getElementById("listaHistorico");
    const vazio = lista.querySelector(".historico-vazio");
    if (vazio) vazio.remove();

    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const itemHtml = `<div class="historico-item p-${tipo}"><strong>[${timestamp}]</strong> ${prodA} + ${prodB} <br><small>${titulo}</small></div>`;
    lista.insertAdjacentHTML("afterbegin", itemHtml);

    historicoTestes.push(`[${timestamp}] ${prodA} + ${prodB} -> ${titulo}`);
}

function resetarSimulador() {
    document.getElementById("produtoA").value = "";
    document.getElementById("produtoB").value = "";
    calcularMistura();
}

function copiarResumo() {
    if (!laudoAtual) return;
    navigator.clipboard.writeText(laudoAtual).then(() => {
        alert("Laudo químico copiado para a área de transferência!");
    });
}

function lerAnalise() {
    if (!textoUltimoAlerta) return;
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(textoUltimoAlerta);
    voz.lang = "pt-BR";
    window.speechSynthesis.speak(voz);
}

function exportarDados() {
    if (historicoTestes.length === 0) {
        alert("O diário de testes está vazio.");
        return;
    }
    const txtContent = "=== DIÁRIO DE TESTES QUÍMICOS - LIMPAPP ===\n\n" + historicoTestes.join("\n");
    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `limpapp_historico_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
}