import pandas as pd
from datetime import date, timedelta

# 1. Definição dos dados de exemplo para o template
# Usamos dados variados para ilustrar o preenchimento
dados_agendamento = {
    'Data': [
        date.today().isoformat(),
        date.today().isoformat(),
        (date.today() + timedelta(days=1)).isoformat(),
        (date.today() + timedelta(days=1)).isoformat(),
        (date.today() + timedelta(days=2)).isoformat()
    ],
    'Hora Início': ['09:00', '10:30', '14:00', '16:00', '11:00'],
    'Hora Fim': ['10:00', '11:00', '15:30', '16:30', '12:00'],
    'ID do Cliente': ['CLI001', 'CLI002', 'CLI003', 'CLI001', 'CLI004'],
    'Nome do Cliente': ['Ana Silva', 'Bruno Costa', 'Carla Dias', 'Ana Silva', 'Daniel Faria'],
    'Telefone do Cliente': ['(11) 98765-4321', '(21) 91234-5678', '(31) 95555-8888', '(11) 98765-4321', '(41) 94444-7777'],
    'E-mail do Cliente': ['ana.silva@email.com', 'bruno.costa@email.com', 'carla.dias@email.com', 'ana.silva@email.com', 'daniel.faria@email.com'],
    'ID do Serviço': ['SERV01', 'SERV02', 'SERV03', 'SERV01', 'SERV04'],
    'Descrição do Serviço': ['Consulta Inicial', 'Manutenção Mensal', 'Instalação Completa', 'Consulta de Acompanhamento', 'Suporte Urgente'],
    'Profissional Responsável': ['João Pereira', 'Maria Oliveira', 'João Pereira', 'Sofia Lima', 'Maria Oliveira'],
    'Status do Agendamento': ['Realizado', 'Agendado', 'Confirmado', 'Cancelado', 'Agendado'],
    'Observações': ['Cliente novo', 'Verificar equipamento X', 'Projeto grande, reservar mais tempo se necessário', 'Cliente pediu para cancelar via telefone', '']
}

# 2. Criação do DataFrame com as colunas na ordem desejada
colunas = ['Data', 'Hora Início', 'Hora Fim', 'ID do Cliente', 'Nome do Cliente', 'Telefone do Cliente', 'E-mail do Cliente', 'ID do Serviço', 'Descrição do Serviço', 'Profissional Responsável', 'Status do Agendamento', 'Observações']
df_agendamentos = pd.DataFrame(dados_agendamento, columns=colunas)

# 3. Exportação do DataFrame para um arquivo Excel
nome_arquivo = 'template_agendamento.xlsx'
df_agendamentos.to_excel(nome_arquivo, index=False)

print(f"Arquivo '{nome_arquivo}' criado com sucesso!")
print("O template contém a estrutura e dados de exemplo.")