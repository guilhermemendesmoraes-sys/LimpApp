from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from typing import List, Optional

app = FastAPI(title="LimpApp API", version="2.0")

# Habilita CORS para o seu arquivo HTML/JS abrir sem bloqueios no navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "limpapp.db"

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Tabela 1: Cadastro centralizado de Produtos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS produtos (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            formula TEXT NOT NULL,
            classe TEXT NOT NULL,
            ph REAL NOT NULL
        )
    ''')
    
    # Tabela 2: Matriz estruturada de Incompatibilidade Química
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS regras_mistura (
            produto_1 TEXT NOT NULL,
            produto_2 TEXT NOT NULL,
            tipo TEXT NOT NULL,
            icone TEXT NOT NULL,
            titulo TEXT NOT NULL,
            descricao TEXT NOT NULL,
            sintomas TEXT,
            epis TEXT,
            acao TEXT,
            PRIMARY KEY (produto_1, produto_2)
        )
    ''')
    
    # Popula o banco com os seus 18 produtos do HTML se estiver vazio
    cursor.execute("SELECT COUNT(*) FROM produtos")
    if cursor.fetchone()[0] == 0:
        produtos_iniciais = [
            ("agua_sanitaria", "Água Sanitária (Hipoclorito)", "NaClO", "Oxidante Forte", 12.5),
            ("vinagre", "Vinagre (Ácido Acético)", "CH₃COOH", "Ácido Fraco", 2.5),
            ("amonia", "Amoníaco (Amônia)", "NH₄OH", "Base Alcalina", 11.5),
            ("alcool", "Álcool Etílico", "C₂H₅OH", "Inflamável", 7.0),
            ("detergente", "Detergente Neutro", "Surfactantes", "Neutro", 7.0),
            ("agua_oxigenada", "Água Oxigenada", "H₂O₂", "Oxidante", 4.5),
            ("bicarbonato", "Bicarbonato de Sódio", "NaHCO₃", "Sal Alcalino", 8.3),
            ("desinfetante_pinho", "Desinfetante de Pinho", "Terpenos / Fenóis", "Variável", 6.0),
            ("soda_caustica", "Limpador de Forno (Soda Cáustica)", "NaOH", "Base Forte", 13.5),
            ("sabao_po", "Sabão em Pó", "Alquilbenzenossulfonato", "Alcalino", 10.5),
            ("removedor_ferrugem", "Removedor de Ferrugem", "H₃PO₄ / C₂H₂O₄", "Ácido Forte", 1.2),
            ("acetona", "Acetona (Solvente)", "CH₃COCH₃", "Solvente Inflamável", 7.0),
            ("desengordurante", "Desengordurante de Cozinha", "Tensoativos / Solventes", "Alcalino", 11.0),
            ("limpador_aluminio", "Limpador de Alumínio", "HF / HCl", "Ácido Forte", 1.5),
            ("querosene", "Querosene / Aguarrás", "Hidrocarbonetos", "Combustível", 7.0),
            ("alcool_isopropilico", "Álcool Isopropílico", "C₃H₇OH", "Solvente Inflamável", 7.0),
            ("acido_muriatico", "Limpa Pedras (Ácido Muriático)", "HCl", "Ácido Forte", 1.0),
            ("cloro_piscina", "Cloro de Piscina", "Ca(ClO)₂", "Oxidante Forte", 11.5)
        ]
        cursor.executemany("INSERT INTO produtos VALUES (?, ?, ?, ?, ?)", produtos_iniciais)
        
        # Carga Inicial de Regras Críticas (Organizadas estritamente por ordem alfabética de ID)
        regras_iniciais = [
            ("acido_muriatico", "agua_sanitaria", "perigo", "☠️", "Perigo Letal: Gás Cloro", 
             "A reação de um ácido forte com hipoclorito libera instantaneamente o gás cloro (Cl₂), altamente corrosivo e sufocante.", 
             "Danos graves ao trato respiratório, asfixia química e queimaduras nas mucosas.", 
             "Máscara Panorâmica, Luvas Nitrílicas, Óculos de Proteção", "Evacue o recinto imediatamente. Não respire o vapor."),
            
            ("agua_sanitaria", "vinagre", "atencao", "⚠️", "Liberação de Gás Cloro Fraco", 
             "Mesmo ácidos fracos reduzem o pH do hipoclorito, gerando vapores de cloro tóxicos em menor escala.", 
             "Ardor nos olhos, tosse persistente e irritação na garganta.", 
             "Luvas Nitrílicas, Óculos de Proteção", "Ventile o local abrindo portas e janelas."),
            
            ("agua_sanitaria", "amonia", "perigo", "💥", "Formação de Cloraminas Tóxicas", 
             "A combinação gera gases de cloramina altamente voláteis e potencialmente explosivos sob confinamento.", 
             "Falta de ar extrema, dor torácica e lacrimejamento intenso.", 
             "Máscara Facial Combinada, Luvas Químicas", "Abandone a área de trabalho imediatamente."),
             
            ("alcool", "agua_sanitaria", "perigo", "🧪", "Formação de Clorofórmio", 
             "A mistura produz clorofórmio e outros compostos organoclorados voláteis com efeito anestésico e hepatotóxico.", 
             "Tontura, dor de cabeça, perda de coordenação motora ou desmaio.", 
             "Óculos Ampla Visão, Luvas de Neoprene", "Cesse a manipulação e mova a pessoa afetada para o ar fresco.")
        ]
        cursor.executemany("INSERT INTO regras_mistura VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", regras_iniciais)
        
        conn.commit()
    conn.close()

init_db()

@app.get("/api/produtos")
def obter_produtos():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, nome FROM produtos ORDER BY nome ASC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "nome": r[1]} for r in rows]

@app.get("/api/analisar")
def analisar(pA: str, pB: str):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Coleta os metadados dos reagentes envolvidos
    cursor.execute("SELECT id, nome, formula, classe, ph FROM produtos WHERE id IN (?, ?)", (pA, pB))
    produtos_dict = {r[0]: {"nome": r[1], "formula": r[2], "classe": r[3], "ph": r[4]} for r in cursor.fetchall()}
    
    dadosA = produtos_dict.get(pA)
    dadosB = produtos_dict.get(pB)
    
    if not dadosA or not dadosB:
        conn.close()
        raise HTTPException(status_code=404, detail="Composto químico não localizado.")
        
    if pA == pB:
        conn.close()
        return {
            "tipo": "seguro", "icone": "✓", "titulo": "Concentração de Reagente",
            "descricao": "Adicionar o mesmo produto altera apenas o volume volumétrico final, sem colisão molecular anômala.",
            "sintomas": "Nenhum além da exposição padrão do rótulo.", "epis": "Luvas de Proteção", "acao": "",
            "dadosA": dadosA, "dadosB": dadosB
        }
        
    # Garante a ordenação alfabética dos IDs para a consulta na matriz de regras
    p1, p2 = sorted([pA, pB])
    
    cursor.execute("SELECT tipo, icone, titulo, descricao, sintomas, epis, acao FROM regras_mistura WHERE produto_1 = ? AND produto_2 = ?", (p1, p2))
    regra = cursor.fetchone()
    conn.close()
    
    if regra:
        return {
            "tipo": regra[0], "icone": regra[1], "titulo": regra[2], "descricao": regra[3],
            "sintomas": regra[4], "epis": regra[5], "acao": regra[6],
            "dadosA": dadosA, "dadosB": dadosB
        }
        
    return {
        "tipo": "seguro", "icone": "✓", "titulo": "Mistura sem Reatividade Crítica",
        "descricao": "Nenhum histórico de reação perigosa catalogado para esta combinação. Respeite as dosagens recomendadas.",
        "sintomas": "Isento de sintomas toxicológicos agudos mapeados.", "epis": "Luvas de Proteção, Óculos de Proteção", "acao": "",
        "dadosA": dadosA, "dadosB": dadosB
    }