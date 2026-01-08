const CHAVE_SISTEMA = "paf_data_" + window.location.pathname.split("/").pop();

// MÁSCARA DE DATA
function mascaraData(campo) {
    let v = campo.value.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{1,2})/, "$1/$2");
    }
    campo.value = v;
}

// ADICIONAR MEMBRO NA TABELA
function addMembro(nome = '', renda = '', data = '', parentesco = '') {
    const table = document.getElementById('membrosBody');
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

// CÁLCULO DA RENDA FAMILIAR TOTAL
function calcularRenda() {
    let total = 0;
    document.querySelectorAll('.m-renda').forEach(input => {
        let valor = parseFloat(input.value);
        if (!isNaN(valor)) total += valor;
    });
    document.getElementById('renda_total').value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// COLETAR TODOS OS DADOS DO FORMULÁRIO
function coletarDados() {
    const data = { inputs: {}, radios: {}, membros: [] };
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(el => {
        if (el.id && el.id !== 'renda_total') data.inputs[el.id] = el.value;
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

// FUNÇÃO PARA GERAR O RELATÓRIO COM LOGOS PADRONIZADAS
function gerarRelatorio() {
    const d = coletarDados();
    const situacao = d.radios.status_andamento ? "Em andamento" : (d.radios.status_concl ? "Concluído em " + d.inputs.data_concl : "N/A");
    
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
                body { font-family: Arial, sans-serif; padding: 30px; font-size: 11px; line-height: 1.4; color: #333; }
                .btn-azul-print { background: #1e3a8a; color: white; border: none; padding: 10px 20px; cursor: pointer; font-weight: bold; border-radius: 5px; margin-bottom: 20px; }
                
                /* Cabeçalho com Logos Padronizadas */
                .report-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
                
                .logo-left, .logo-right { width: 120px; text-align: center; }
                .logo-center { flex: 1; text-align: center; }

                /* Tamanho padronizado para todas as logos */
                .report-header img { height: 80px; width: auto; object-fit: contain; }
                
                .header-text h2 { font-size: 12px; margin: 5px 0 0 0; color: #1e3a8a; text-transform: uppercase; }
                .header-text h3 { font-size: 11px; margin: 2px 0; font-weight: normal; }
                .header-text h4 { font-size: 10px; margin: 0; color: #64748b; }
                .badge { background: #1e3a8a; color: white; padding: 4px 12px; border-radius: 15px; font-size: 10px; display: inline-block; margin-top: 8px; font-weight: bold; }

                h1 { text-align: center; color: #1e3a8a; margin: 20px 0; font-size: 16px; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                h2.section-title { background: #f1f5f9; color: #1e3a8a; padding: 8px; font-size: 11px; border-left: 6px solid #1e3a8a; margin-top: 20px; text-transform: uppercase; font-weight: bold; }
                
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .box { border: 1px solid #ddd; padding: 8px; border-radius: 4px; background: #fafafa; }
                .label { font-weight: bold; font-size: 9px; color: #555; display: block; text-transform: uppercase; margin-bottom: 2px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                th { background: #eee; font-size: 10px; text-transform: uppercase; }
                
                .full-box { border: 1px solid #ddd; padding: 12px; margin-top: 8px; min-height: 40px; white-space: pre-wrap; background: #fff; }
                
                .assinaturas-container { text-align: center; margin-top: 60px; display: flex; flex-direction: column; align-items: center; gap: 45px; }
                .linha-assinatura { width: 380px; border-top: 1px solid #000; padding-top: 6px; font-weight: bold; font-size: 10px; text-transform: uppercase; }

                @media print { .btn-azul-print { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <button class="btn-azul-print" onclick="window.print()">🖨️ IMPRIMIR RELATÓRIO</button>

            <header class="report-header">
                <div class="logo-left"><img src="brasao.png"></div>
                <div class="logo-center">
                    <img src="logo_creas.png">
                    <div class="header-text">
                        <h2>Secretaria de Estado de Desenvolvimento Social - SEDESE</h2>
                        <h3>Subsecretaria de Assistência Social - SUBAS</h3>
                        <h4>Superintendência de Proteção Social Especial</h4>
                        <div class="badge">CREAS Regional Alto Jequitinhonha - Diamantina/MG</div>
                    </div>
                </div>
                <div class="logo-right"><img src="logo_minas.png"></div>
            </header>

            <h1>PLANO DE ACOMPANHAMENTO FAMILIAR - PAF</h1>

            <h2 class="section-title">I - IDENTIFICAÇÃO</h2>
            <div class="grid">
                <div class="box"><span class="label">CREAS:</span>${d.inputs.nome_creas}</div>
                <div class="box"><span class="label">Nº Identificador:</span>${d.inputs.id_creas}</div>
                <div class="box"><span class="label">Responsável Familiar:</span>${d.inputs.resp_familiar}</div>
                <div class="box"><span class="label">CPF:</span>${d.inputs.cpf}</div>
                <div class="box"><span class="label">NIS:</span>${d.inputs.nis}</div>
                <div class="box"><span class="label">Nascimento:</span>${d.inputs.nasc_resp}</div>
                <div class="box"><span class="label">Endereço:</span>${d.inputs.endereco}</div>
                <div class="box"><span class="label">Telefone:</span>${d.inputs.telefone}</div>
                <div class="box"><span class="label">Início PAF:</span>${d.inputs.data_paf}</div>
                <div class="box"><span class="label">Situação:</span>${situacao}</div>
            </div>

            <h2 class="section-title">II - COMPOSIÇÃO FAMILIAR E RENDA</h2>
            <table>
                <thead><tr><th>Nome</th><th>Renda</th><th>Nascimento</th><th>Parentesco</th></tr></thead>
                <tbody>${membrosHtml}</tbody>
            </table>
            <div class="box" style="margin-top:10px; text-align:right;"><strong>Renda Familiar Total: ${document.getElementById('renda_total').value}</strong></div>

            <h2 class="section-title">III - DEMANDAS E VIOLAÇÕES</h2>
            <div class="full-box">${d.inputs.texto_demandas}</div>

            <h2 class="section-title">IV - DIAGNÓSTICO E INTERVENÇÃO</h2>
            <div class="grid">
                <div class="box"><span class="label">1) Potencialidades:</span>${d.inputs.potencialidades}</div>
                <div class="box"><span class="label">2) Vulnerabilidades:</span>${d.inputs.vulnerabilidades}</div>
                <div class="box"><span class="label">3) Prioridades:</span>${d.inputs.prioridades}</div>
                <div class="box"><span class="label">4) Proposta:</span>${d.inputs.proposta}</div>
                <div class="box"><span class="label">5) Responsável:</span>${d.inputs.responsavel}</div>
                <div class="box"><span class="label">6) Resultados Esperados:</span>${d.inputs.resultados_esperados}</div>
                <div class="box"><span class="label">7) Atividades:</span>${d.inputs.atividades_lista}</div>
                <div class="box"><span class="label">8) Resultados Alcançados:</span>${d.inputs.resultados_alcancados}</div>
            </div>

            <h2 class="section-title">V - ARTICULAÇÃO E COMPROMISSOS</h2>
            <div class="grid">
                <div class="box"><span class="label">9) Articulação Rede:</span>${d.inputs.obs_rede}</div>
                <div class="box"><span class="label">10) Compromissos Família:</span>${d.inputs.comp_familia}</div>
            </div>
            <div class="box"><span class="label">11) Compromissos Equipe:</span>${d.inputs.obs_equipe}</div>

            <h2 class="section-title">VI - ACOMPANHAMENTO E EVOLUÇÃO</h2>
            <div class="box"><span class="label">Objetivo:</span>${d.inputs.obj_acompanhamento}</div>
            <div class="box"><span class="label">Acordos:</span>${d.inputs.acordos_familia}</div>
            <div class="box"><span class="label">Encaminhamentos:</span>${d.inputs.encaminhamentos_rede}</div>
            <div class="full-box"><strong>EVOLUÇÃO:</strong><br>${d.inputs.evolucao_final}</div>

            <div class="assinaturas-container">
                <p>Diamantina/MG, ____ de __________ de 2026.</p>
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

// SALVAR E IMPORTAR
function validarESalvar() {
    localStorage.setItem(CHAVE_SISTEMA, JSON.stringify(coletarDados()));
    alert("✅ Alterações salvas com sucesso!");
}

function exportarDados() {
    const blob = new Blob([JSON.stringify(coletarDados(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `PAF_${document.getElementById('resp_familiar').value || 'dados'}.json`;
    a.click();
}

function importarDados(input) {
    const reader = new FileReader();
    reader.onload = (e) => { aplicarDados(JSON.parse(e.target.result)); };
    if (input.files[0]) reader.readAsText(input.files[0]);
}

function aplicarDados(data) {
    if (!data) return;
    document.getElementById('membrosBody').innerHTML = '';
    for (let id in data.inputs) { if (document.getElementById(id)) document.getElementById(id).value = data.inputs[id]; }
    if (data.radios) { for (let id in data.radios) { if (document.getElementById(id)) document.getElementById(id).checked = data.radios[id]; } }
    
    // Trava do ID após carregar backup
    const idCampo = document.getElementById('id_creas');
    if(idCampo) {
        idCampo.value = "31216097899";
        idCampo.readOnly = true;
    }

    if (data.membros && data.membros.length > 0) {
        data.membros.forEach(m => addMembro(m.nome, m.renda, m.data, m.parentesco));
    } else { addMembro(); }
    calcularRenda();
}

window.onload = () => {
    // Trava do ID no início
    const idCampo = document.getElementById('id_creas');
    if(idCampo) {
        idCampo.value = "31216097899";
        idCampo.readOnly = true;
    }

    const saved = localStorage.getItem(CHAVE_SISTEMA);
    if (saved) aplicarDados(JSON.parse(saved));
    else addMembro();
};