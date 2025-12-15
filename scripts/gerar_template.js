import * as XLSX from 'xlsx';
import { format, addDays } from 'date-fns';

// 1. Definição dos dados de exemplo para o template
const hoje = new Date();
const dados_agendamento = [
    {
        'Data': format(hoje, 'yyyy-MM-dd'),
        'Hora Início': '09:00',
        'Hora Fim': '10:00',
        'ID do Cliente': 'CLI001',
        'Nome do Cliente': 'Ana Silva',
        'Telefone do Cliente': '(11) 98765-4321',
        'E-mail do Cliente': 'ana.silva@email.com',
        'ID do Serviço': 'SERV01',
        'Descrição do Serviço': 'Consulta Inicial',
        'Profissional Responsável': 'João Pereira',
        'Status do Agendamento': 'Realizado',
        'Observações': 'Cliente novo'
    },
    {
        'Data': format(hoje, 'yyyy-MM-dd'),
        'Hora Início': '10:30',
        'Hora Fim': '11:00',
        'ID do Cliente': 'CLI002',
        'Nome do Cliente': 'Bruno Costa',
        'Telefone do Cliente': '(21) 91234-5678',
        'E-mail do Cliente': 'bruno.costa@email.com',
        'ID do Serviço': 'SERV02',
        'Descrição do Serviço': 'Manutenção Mensal',
        'Profissional Responsável': 'Maria Oliveira',
        'Status do Agendamento': 'Agendado',
        'Observações': 'Verificar equipamento X'
    },
    {
        'Data': format(addDays(hoje, 1), 'yyyy-MM-dd'),
        'Hora Início': '14:00',
        'Hora Fim': '15:30',
        'ID do Cliente': 'CLI003',
        'Nome do Cliente': 'Carla Dias',
        'Telefone do Cliente': '(31) 95555-8888',
        'E-mail do Cliente': 'carla.dias@email.com',
        'ID do Serviço': 'SERV03',
        'Descrição do Serviço': 'Instalação Completa',
        'Profissional Responsável': 'João Pereira',
        'Status do Agendamento': 'Confirmado',
        'Observações': 'Projeto grande, reservar mais tempo se necessário'
    },
    {
        'Data': format(addDays(hoje, 1), 'yyyy-MM-dd'),
        'Hora Início': '16:00',
        'Hora Fim': '16:30',
        'ID do Cliente': 'CLI001',
        'Nome do Cliente': 'Ana Silva',
        'Telefone do Cliente': '(11) 98765-4321',
        'E-mail do Cliente': 'ana.silva@email.com',
        'ID do Serviço': 'SERV01',
        'Descrição do Serviço': 'Consulta de Acompanhamento',
        'Profissional Responsável': 'Sofia Lima',
        'Status do Agendamento': 'Cancelado',
        'Observações': 'Cliente pediu para cancelar via telefone'
    }
];

// 2. Criação da planilha a partir dos dados
const worksheet = XLSX.utils.json_to_sheet(dados_agendamento);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Agendamentos');

// 3. Exportação para um arquivo Excel
const nome_arquivo = 'template_agendamento.xlsx';
XLSX.writeFile(workbook, nome_arquivo);

console.log(`Arquivo '${nome_arquivo}' criado com sucesso!`);