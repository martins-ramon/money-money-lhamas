import { t, nameLabel } from './i18n.js';
import { FINANCE_MISSIONS, financeMissions } from './finance-missions.js';

// Original labels stay stable as keys; scene objects and multiplayer IDs never change.
const portuguese = {
  'Food truck': 'Lanchonete móvel',
  'Clothes shop': 'Loja de roupas',
  'Your place': 'Sua casa',
  'Llama Labs HQ': 'Sede da Llama Labs',
  'Moon house deal': 'Compra da casa na Lua',
  'Picnic mission': 'Missão do piquenique',
  'Explorer mission': 'Missão de exploração',
  'Helper mission': 'Missão de ajuda',
  'BBQ & chimarrão party': 'Festa de churrasco e chimarrão',
  'OPENS LATER': 'ABRE MAIS TARDE',
  'FOOD TRUCK · $60': 'LANCHE · $60',
  'CLOTHES · $120': 'ROUPAS · $120',
  'PIGGY BANK · 2%': 'BANCO COFRINHO · 2%',
  'Buy a meal ($60)': 'Comprar uma refeição ($60)',
  'Buy streetwear ($120)': 'Comprar roupas casuais ($120)',
  'Visit the Piggy Bank': 'Visitar o Banco Cofrinho',
  'YOUR FUTURE HOME': 'SUA FUTURA CASA',
  'Customize your place': 'Personalizar sua casa',
  'Run Llama Labs': 'Administrar a Llama Labs',
  'Start the BBQ party': 'Começar a festa de churrasco',
  'Sign the Moon deal with Elo Musk': 'Comprar a casa na Lua com Elo Musk',
  'MY FIRST CAR': 'MEU PRIMEIRO CARRO',
  'HOME SWEET HOME': 'LAR, DOCE LAR',
  'Drive your own car': 'Dirigir seu próprio carro',
  'Enter your mansion': 'Entrar na sua mansão',
  'IDEAS PARK': 'PARQUE DAS IDEIAS',
  'BEACH · MARINA': 'PRAIA · MARINA',
  'Drive the red car': 'Dirigir o carro vermelho',
  'Drive the yellow car': 'Dirigir o carro amarelo',
  'Drive the blue car': 'Dirigir o carro azul',
  'Pilot the boat': 'Pilotar o barco',
  'Pilot the yacht': 'Pilotar o iate',
  'Launch the glider': 'Decolar com o planador',
  'Travel to the Moon': 'Viajar para a Lua',
  'Return to the city': 'Voltar à cidade',
  'Return to the dock': 'Voltar ao cais',
  'Exit the vehicle': 'Sair do veículo',
  'Driving': 'Dirigindo',
  'Sailing a boat': 'Pilotando um barco',
  'Sailing a yacht': 'Pilotando um iate',
  'Gliding': 'Planando',
  'Flying': 'Voando',
  'Dancing': 'Dançando',
  'Exploring': 'Explorando',
  'Glider launched! Use your movement controls to steer. Land automatically.': 'Planador no ar! Use os controles de movimento para pilotar. O pouso é automático.',
  'Back at the dock. Your boat is ready for another trip!': 'De volta ao cais. Seu barco está pronto para outra viagem!',
  'You left the vehicle.': 'Você saiu do veículo.',
  'Wear Superman, Cyborg or Dragon to fly.': 'Use a skin de Superman, Ciborgue ou Dragão para voar.',
  'Flight on! Use your movement controls. Tap Fly again to land.': 'Voo ativado! Use os controles de movimento. Toque em Voar novamente para pousar.',
  'Landing…': 'Pousando…',
  'Dance time! Move to stop.': 'Hora da dança! Movimente-se para parar.',
  'Dance stopped.': 'Dança encerrada.',
  'Smooth landing! Find more gliders around the city.': 'Pouso tranquilo! Encontre mais planadores pela cidade.',
};

export function worldText(source) {
  if (source.startsWith('Work at ')) {
    const name = nameLabel(source.slice(8));
    return t(`Work at ${name}`, `Trabalhar em ${name}`);
  }
  if (source === 'CHURRASCO!') return t('BBQ!', 'CHURRASCO!');
  const mission = FINANCE_MISSIONS.find(item => item.title === source);
  if (mission) return financeMissions().find(item => item.id === mission.id).title;
  return portuguese[source] ? t(source, portuguese[source]) : nameLabel(source);
}

export function refreshWorldLabel(object) {
  object.labelSource ??= object.label;
  if (object.labelSource) object.label = worldText(object.labelSource);
}
