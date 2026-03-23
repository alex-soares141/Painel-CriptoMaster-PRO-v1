// Formatação de Moedas
const formatBRL = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const formatUSD = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: value > 1e9 ? 'compact' : 'standard'
    }).format(value);
};

// Lógica de Busca de Dados
async function fetchData() {
    try {
        const indicator = document.getElementById('update-indicator');
        indicator?.classList.add('animate-pulse');

        // Busca preço atual e variação
        const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl,usd&include_24hr_change=true');
        const priceData = await priceResponse.json();
        
        // Busca métricas globais
        const globalResponse = await fetch('https://api.coingecko.com/api/v3/global');
        const globalData = await globalResponse.json();

        const btcPriceBRL = priceData.bitcoin.brl;
        const btcChange = priceData.bitcoin.brl_24h_change;

        // Atualiza Preço Unitário
        const priceEl = document.getElementById('btc-price');
        if (priceEl) priceEl.innerText = formatBRL(btcPriceBRL);
        
        // Atualiza Conversão de R$ 5,00
        const conversionEl = document.getElementById('conversion-result');
        if (conversionEl) {
            const btcAmount = 5 / btcPriceBRL;
            // Mostra com 8 casas decimais (padrão satoshis)
            conversionEl.innerText = btcAmount.toFixed(8) + " BTC";
        }

        // Atualiza Pílula de Variação
        const changePill = document.getElementById('price-change-pill');
        const changeText = document.getElementById('price-change-percent');
        const priceIcon = document.getElementById('price-icon');
        
        if (changeText) changeText.innerText = `${btcChange.toFixed(2)}%`;
        
        if (changePill && priceIcon) {
            if (btcChange >= 0) {
                changePill.className = 'bg-green-400/30 px-3 py-1 rounded-full flex items-center';
                priceIcon.className = 'fas fa-arrow-up mr-1';
            } else {
                changePill.className = 'bg-red-400/30 px-3 py-1 rounded-full flex items-center';
                priceIcon.className = 'fas fa-arrow-down mr-1';
            }
        }

        // Atualiza Métricas Globais
        const gData = globalData.data;
        const dominanceEl = document.getElementById('btc-dominance');
        if (dominanceEl) dominanceEl.innerText = `${gData.market_cap_percentage.btc.toFixed(1)}%`;
        
        const marketCapEl = document.getElementById('total-market-cap');
        if (marketCapEl) marketCapEl.innerText = formatUSD(gData.total_market_cap.usd);
        
        const volumeEl = document.getElementById('total-volume');
        if (volumeEl) volumeEl.innerText = formatUSD(gData.total_volume.usd);
        
        const activeEl = document.getElementById('active-cryptos');
        if (activeEl) activeEl.innerText = gData.active_cryptocurrencies.toLocaleString();

        // Atualiza Hora
        const lastUpdateEl = document.getElementById('last-update');
        if (lastUpdateEl) lastUpdateEl.innerText = new Date().toLocaleTimeString('pt-BR');
        
        setTimeout(() => indicator?.classList.remove('animate-pulse'), 1000);

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        const priceEl = document.getElementById('btc-price');
        if (priceEl) priceEl.innerText = "Erro ao carregar";
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setInterval(fetchData, 60000);
});
