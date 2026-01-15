// ==========================================
// CONFIGURAÇÃO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBnHxMaz-JoMuFmz80kD9SDLAOYH0w_Sps",
  authDomain: "sistema-creas-paf.firebaseapp.com",
  projectId: "sistema-creas-paf",
  storageBucket: "sistema-creas-paf.appspot.com",
  messagingSenderId: "57137105910",
  appId: "1:57137105910:web:690ebff3cbad88e283527"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const CHAVE_COLECAO = "pacientes_paf";
let mapaPacientes = {};

// ==========================================
// MÁSCARAS E UTILITÁRIOS
// ==========================================
function mascaraData(campo) {
    let v = campo.value.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length >= 5) v = v.replace(/^(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length >= 3) v = v.replace(/^(\d{2})(\d{1,2})/, "$1/$2");
    campo.value = v;
}

// ==========================================
// GESTÃO DE MEMBROS DA FAMÍLIA
// ==========================================
function addMembro(nome = '', renda = '', data = '', parentesco = '') {
    const table = document.getElementById('membrosBody');
    if (!table) return;
    const row = table.insertRow();
    row.innerHTML = `
        <td><input type="text" class="m-nome" value="${nome}"></td>
        <td><input type="number" class="m-renda" value="${renda}" step="0.01" oninput="calcularRenda()"></td>
        <td><input type="text" class="m-data" value="${data}" placeholder="00/00/0000" maxlength="10" oninput="mascaraData(this)"></td>
        <td><input type="text" class="m-parent" value="${parentesco}"></td>
        <td class="no-print" align="center">
            <button onclick="this.parentElement.parentElement.remove(); calcularRenda();" style="background:red; color:white; border:none; border-radius:50%; width:22px; cursor:pointer;">×</button>
        </td>
    `;
    calcularRenda();
}

function calcularRenda() {
    let total = 0;
    document.querySelectorAll('.m-renda').forEach(input => {
        let valor = parseFloat(input.value);
        if (!isNaN(valor)) total += valor;
    });
    const campoTotal = document.getElementById('renda_total');
    if (campoTotal) {
        campoTotal.value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

// ==========================================
// COLETA E APLICAÇÃO DE DADOS
// ==========================================
function coletarDados() {
    const data = { inputs: {}, radios: {}, membros: [] };
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
        if (el.id && el.id !== 'renda_total' && el.id !== 'campo-pesquisa') {
            data.inputs[el.id] = el.value;
        }
    });
    document.querySelectorAll('input[type="radio"]').forEach(el => {
        if (el.id) data.radios[el.id] = el.checked;
    });
    document.querySelectorAll('#membrosBody tr').forEach(tr => {
        data.membros.push({
            nome: tr.querySelector('.m-nome').value,
            renda: tr.querySelector('.m-renda').value,
            data: tr.querySelector('.m-data').value,
            parentesco: tr.querySelector('.m-parent').value
        });
    });
    return data;
}

function aplicarDados(data) {
    if (!data) return;
    document.getElementById('membrosBody').innerHTML = '';
    for (let id in data.inputs) { 
        const el = document.getElementById(id);
        if (el) el.value = data.inputs[id]; 
    }
    for (let id in data.radios) { 
        const el = document.getElementById(id);
        if (el) el.checked = data.radios[id]; 
    }
    const idC = document.getElementById('id_creas');
    if(idC) { idC.value = "31216097899"; idC.readOnly = true; }
    if (data.membros && data.membros.length > 0) {
        data.membros.forEach(m => addMembro(m.nome, m.renda, m.data, m.parentesco));
    } else { 
        addMembro(); 
    }
    calcularRenda();
}

// ==========================================
// PERSISTÊNCIA E BACKUP (AJUSTADOS)
// ==========================================
async function validarESalvar() {
    const dados = coletarDados();
    const cpf = dados.inputs.cpf;
    const nomeBruto = dados.inputs.resp_familiar || "SEM_NOME";
    const nomeLimpo = nomeBruto.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    if (!cpf) { alert("⚠️ Preencha o CPF para salvar."); return; }

    try {
        await db.collection(CHAVE_COLECAO).doc(cpf).set(dados);
        
        // Backup automático com CPF e Nome
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const nomeArquivo = `PAF_${cpf}_${nomeLimpo}.json`;
        a.href = URL.createObjectURL(blob);
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        alert("✅ Salvo na Nuvem e Backup [" + nomeArquivo + "] gerado!");
        listarPacientes(); 
    } catch (error) {
        alert("❌ Erro ao salvar na nuvem.");
        console.error(error);
    }
}

function exportarDados() {
    const dados = coletarDados();
    const cpf = dados.inputs.cpf || "000";
    const nomeBruto = dados.inputs.resp_familiar || "SEM_NOME";
    const nomeLimpo = nomeBruto.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.style.display = 'none';
    a.href = url;
    a.download = `PAF_${cpf}_${nomeLimpo}.json`;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

function importarDados(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            aplicarDados(dados);
            alert("✅ Backup carregado com sucesso!");
        } catch (err) {
            alert("❌ Erro ao ler arquivo JSON.");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// BUSCA E LISTAGEM
// ==========================================
async function listarPacientes() {
    const datalist = document.getElementById('lista-pacientes');
    if (!datalist) return;
    try {
        const snapshot = await db.collection(CHAVE_COLECAO).get();
        datalist.innerHTML = ''; mapaPacientes = {}; 
        snapshot.forEach(doc => {
            const p = doc.data();
            const nome = p.inputs.resp_familiar || "Sem Nome";
            const textoBusca = `${nome} - CPF: ${doc.id}`;
            const option = document.createElement('option');
            option.value = textoBusca;
            datalist.appendChild(option);
            mapaPacientes[textoBusca] = doc.id;
        });
    } catch (e) { console.error(e); }
}

function verificarSelecao(valor) {
    if (mapaPacientes[valor]) carregarPaciente(mapaPacientes[valor]);
}

async function carregarPaciente(cpf) {
    const doc = await db.collection(CHAVE_COLECAO).doc(cpf).get();
    if (doc.exists) aplicarDados(doc.data());
}

// ==========================================
// GERAR RELATÓRIO (4 ASSINATURAS RESTAURADAS)
// ==========================================
function gerarRelatorio() {
    const d = coletarDados();
    const situacao = d.radios.status_andamento ? "Em andamento" : (d.radios.status_concl ? "Concluído em " + d.inputs.data_concl : "N/A");
    const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    
    let membrosHtml = d.membros.map(m => `
        <tr>
            <td>${m.nome}</td>
            <td>R$ ${m.renda || '0'}</td>
            <td>${m.data}</td>
            <td>${m.parentesco}</td>
        </tr>`).join('');

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>Relatório PAF - ${d.inputs.resp_familiar}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; font-size: 10px; line-height: 1.3; color: #333; }
                .report-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 15px; }
                .logo-left, .logo-right { width: 100px; text-align: center; }
                .logo-center { flex: 1; text-align: center; }
                .report-header img { height: 65px; width: auto; object-fit: contain; }
                .header-text h2 { font-size: 11px; margin: 0; color: #1e3a8a; text-transform: uppercase; }
                .badge { background: #1e3a8a; color: white; padding: 3px 10px; border-radius: 10px; font-size: 9px; display: inline-block; margin-top: 5px; }
                h1 { text-align: center; color: #1e3a8a; margin: 10px 0; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #eee; }
                h2.section-title { background: #f1f5f9; color: #1e3a8a; padding: 5px; font-size: 10px; border-left: 5px solid #1e3a8a; margin-top: 15px; text-transform: uppercase; font-weight: bold; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .box { border: 1px solid #ddd; padding: 6px; border-radius: 4px; background: #fafafa; }
                .label { font-weight: bold; font-size: 8px; color: #555; display: block; text-transform: uppercase; margin-bottom: 2px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
                th { background: #eee; font-size: 9px; }
                .full-box { border: 1px solid #ddd; padding: 10px; margin-top: 5px; min-height: 30px; white-space: pre-wrap; background: #fff; border-radius: 4px; }
                .assinaturas-container { text-align: center; margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 35px; }
                .linha-assinatura { width: 350px; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase; }
                @media print { .no-print { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <button class="no-print" onclick="window.print()" style="padding:8px; margin-bottom:15px; background:#1e3a8a; color:white; border:none; border-radius:4px; cursor:pointer;">🖨️ IMPRIMIR</button>

            <header class="report-header">
                <div class="logo-left"><img src="brasao.png"></div>
                <div class="logo-center">
                    <div class="header-text">
                        <h2>Secretaria de Estado de Desenvolvimento Social - SEDESE</h2>
                        <div class="badge">CREAS Regional Alto Jequitinhonha - Diamantina/MG</div>
                    </div>
                </div>
                <div class="logo-right"><img src="logo_creas.png"></div>
            </header>

            <h1>PLANO DE ACOMPANHAMENTO FAMILIAR - PAF</h1>

            <h2 class="section-title">I - IDENTIFICAÇÃO</h2>
            <div class="grid">
                <div class="box"><span class="label">Responsável Familiar:</span>${d.inputs.resp_familiar || '---'}</div>
                <div class="box"><span class="label">CPF:</span>${d.inputs.cpf || '---'}</div>
                <div class="box"><span class="label">NIS:</span>${d.inputs.nis || 'Não informado'}</div>
                <div class="box"><span class="label">Nascimento:</span>${d.inputs.nasc_resp || '---'}</div>
                <div class="box"><span class="label">Endereço:</span>${d.inputs.endereco || '---'}</div>
                <div class="box"><span class="label">Telefone:</span>${d.inputs.telefone || '---'}</div>
                <div class="box"><span class="label">Início PAF:</span>${d.inputs.data_paf || '---'}</div>
                <div class="box"><span class="label">Situação:</span>${situacao}</div>
            </div>

            <h2 class="section-title">II - COMPOSIÇÃO FAMILIAR E RENDA</h2>
            <table>
                <thead><tr><th>Nome</th><th>Renda</th><th>Nascimento</th><th>Parentesco</th></tr></thead>
                <tbody>${membrosHtml}</tbody>
            </table>
            <div class="box" style="margin-top:5px; text-align:right;"><strong>Renda Familiar Total: ${document.getElementById('renda_total').value}</strong></div>
            <div class="full-box"><strong>OBSERVAÇÕES BPC/PBF:</strong><br>${d.inputs.obs_beneficios || 'Nenhuma'}</div>

            <h2 class="section-title">III - DEMANDAS E VIOLAÇÕES</h2>
            <div class="full-box">${d.inputs.texto_demandas || '---'}</div>

            <h2 class="section-title">IV - DIAGNÓSTICO E INTERVENÇÃO</h2>
            <div class="grid">
                <div class="box"><span class="label">1) Potencialidades:</span>${d.inputs.potencialidades || '---'}</div>
                <div class="box"><span class="label">2) Vulnerabilidades:</span>${d.inputs.vulnerabilidades || '---'}</div>
                <div class="box"><span class="label">3) Prioridades:</span>${d.inputs.prioridades || '---'}</div>
                <div class="box"><span class="label">4) Proposta:</span>${d.inputs.proposta || '---'}</div>
                <div class="box"><span class="label">5) Responsável:</span>${d.inputs.responsavel || '---'}</div>
                <div class="box"><span class="label">6) Resultados Esperados:</span>${d.inputs.resultados_esperados || '---'}</div>
            </div>

            <h2 class="section-title">V - ARTICULAÇÃO E COMPROMISSOS</h2>
            <div class="grid">
                <div class="box"><span class="label">7) Articulação Rede:</span>${d.inputs.obs_rede || '---'}</div>
                <div class="box"><span class="label">8) Compromissos Família:</span>${d.inputs.comp_familia || '---'}</div>
            </div>
            <div class="box" style="margin-top:5px;"><span class="label">9) Compromissos Equipe:</span>${d.inputs.obs_equipe || '---'}</div>

            <h2 class="section-title">VI - ACOMPANHAMENTO E EVOLUÇÃO</h2>
            <div class="full-box"><strong>EVOLUÇÃO:</strong><br>${d.inputs.evolucao_final || '---'}</div>

            <div class="assinaturas-container">
                <p>Diamantina/MG, ${dataHoje}.</p>
                <div class="linha-assinatura">Assinatura do Técnico Responsável</div>
                <div class="linha-assinatura">Assinatura do Técnico Responsável</div>
                <div class="linha-assinatura">Assinatura do Técnico Responsável</div>
                <div class="linha-assinatura">Assinatura do Responsável Familiar</div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.onload = () => {
    const idC = document.getElementById('id_creas');
    if(idC) { idC.value = "31216097899"; idC.readOnly = true; }
    listarPacientes();
};