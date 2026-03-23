import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  Wallet,
  Info,
  ArrowRightLeft,
  Bitcoin,
  BarChart3,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface MarketData {
  priceBRL: number;
  change24h: number;
  dominance: number;
  totalMarketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

function App() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Simulator states
  const [investmentAmount, setInvestmentAmount] = useState<number>(5.65);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [exchangeFee, setExchangeFee] = useState<number>(2.0); // Mercado Pago standard fee approx 2%
  const [quickBuyAmount, setQuickBuyAmount] = useState<number>(5.0); // New state for quick buy amount
  const [showRecommendation, setShowRecommendation] = useState<boolean>(true);
  const [lastAutoNotifyPrice, setLastAutoNotifyPrice] = useState<number>(0);
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(false);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        new Notification("CriptoMaster PRO", {
          body: "Notificações ativadas com sucesso!",
        });
      }
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [priceRes, globalRes] = await Promise.all([
        fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false",
        ),
        fetch("https://api.coingecko.com/api/v3/global"),
      ]);

      const priceData = await priceRes.json();
      const globalData = await globalRes.json();

      const marketData = priceData.market_data;

      setData({
        priceBRL: marketData.current_price.brl,
        change24h: marketData.price_change_percentage_24h,
        dominance: globalData.data.market_cap_percentage.btc,
        totalMarketCap: globalData.data.total_market_cap.usd,
        volume24h: globalData.data.total_volume.usd,
        high24h: marketData.high_24h.brl,
        low24h: marketData.low_24h.brl,
      });

      if (purchasePrice === 0) setPurchasePrice(marketData.current_price.brl);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
      setLoading(false);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds for real-time feel
    return () => clearInterval(interval);
  }, []);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  const formatUSD = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(val);

  // Buy/Sell Logic (Simplified)
  const getRecommendation = () => {
    if (!data)
      return {
        label: "Analizando...",
        color: "text-gray-500",
        bg: "bg-gray-100",
      };

    // Simple logic: if price is closer to 24h low, it's a potential BUY.
    // If closer to 24h high, it's a potential SELL (or hold).
    const range = data.high24h - data.low24h;
    const position = (data.priceBRL - data.low24h) / range;

    if (position < 0.3)
      return {
        label: "COMPRA (Preço Baixo)",
        color: "text-green-600",
        bg: "bg-green-100",
        icon: <TrendingUp className="w-5 h-5" />,
      };
    if (position > 0.7)
      return {
        label: "VENDA/AGUARDAR (Preço Alto)",
        color: "text-red-600",
        bg: "bg-red-100",
        icon: <TrendingDown className="w-5 h-5" />,
      };
    return {
      label: "NEUTRO (Aguardar)",
      color: "text-blue-600",
      bg: "bg-blue-100",
      icon: <ArrowRightLeft className="w-5 h-5" />,
    };
  };

  const recommendation = getRecommendation();

  // Auto Notify Logic
  useEffect(() => {
    if (showRecommendation && recommendation.label.includes("COMPRA") && data) {
      // Only notify if price changed significantly or it's the first time
      const priceDiff = Math.abs(data.priceBRL - lastAutoNotifyPrice);
      if (lastAutoNotifyPrice === 0 || priceDiff > lastAutoNotifyPrice * 0.01) {
        // 1. WhatsApp Notify (Needs Popup Permission)
        handleWhatsAppNotify();

        // 2. Desktop Notification
        if (notificationsEnabled) {
          new Notification("🚨 HORA DE COMPRAR BITCOIN!", {
            body: `Preço atual: ${formatBRL(data.priceBRL)}\nRecomendação: ${recommendation.label}`,
            icon: "/favicon.svg",
          });
        }

        // 3. Audio Alert (Needs User Interaction at least once)
        const audio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
        );
        audio
          .play()
          .catch(() =>
            console.log("Áudio bloqueado, clique na página para liberar."),
          );

        setLastAutoNotifyPrice(data.priceBRL);
      }
    }
  }, [data, showRecommendation, recommendation.label, notificationsEnabled]);

  const handleWhatsAppNotify = () => {
    if (!data) return;
    const message = `CriptoMaster PRO - Hora de Agir!\n\nStatus: ${recommendation.label}\nPreço Atual: ${formatBRL(data.priceBRL)}\nMínima 24h: ${formatBRL(data.low24h)}\nMáxima 24h: ${formatBRL(data.high24h)}\n\nPainel: ${window.location.origin}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://api.whatsapp.com/send?phone=5533988997674&text=${encodedMessage}`,
      "_blank",
    );
  };

  // Profit calculation considering Mercado Pago fees
  // Fee is applied twice: once at purchase and once at sale
  const buyFee = investmentAmount * (exchangeFee / 100);
  const netInvestment = investmentAmount - buyFee;

  const btcOwned = netInvestment / purchasePrice;
  const grossSaleValue = data ? btcOwned * data.priceBRL : 0;

  const sellFee = grossSaleValue * (exchangeFee / 100);
  const netSaleValue = grossSaleValue - sellFee;

  const profit = netSaleValue - investmentAmount;
  const profitPercent = (profit / investmentAmount) * 100;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 w-full font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-1.5 sm:p-2 rounded-lg">
              <Bitcoin className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none">
              CriptoMaster <span className="text-orange-500">PRO</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-sm font-medium text-slate-500">
            <div
              className={`flex items-center gap-1 sm:gap-1.5 ${loading ? "animate-pulse" : ""}`}
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
              <span className="hidden xs:inline">Ao Vivo</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1">
              <RefreshCw
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              <span>{lastUpdate || "--:--:--"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Main Price Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
          {/* Main Price Card */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-orange-200/50 overflow-hidden relative">
            <Bitcoin className="absolute -right-6 -bottom-6 w-24 h-24 sm:w-32 sm:h-32 opacity-10 rotate-12" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                  <p className="text-orange-100 font-medium mb-0.5 sm:mb-1 uppercase tracking-wider text-[9px] sm:text-[10px]">
                    Preço Atual Bitcoin
                  </p>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none">
                    {data ? formatBRL(data.priceBRL) : "..."}
                  </h2>
                </div>
                <div
                  className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 ${data && data.change24h >= 0 ? "bg-white/20" : "bg-red-500/20"}`}
                >
                  {data && data.change24h >= 0 ? (
                    <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  )}
                  {data ? `${data.change24h.toFixed(2)}%` : "0.00%"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/10">
                <div>
                  <p className="text-orange-100 text-[9px] sm:text-[10px] mb-0.5">
                    Mínima (24h)
                  </p>
                  <p className="font-bold text-sm sm:text-base">
                    {data ? formatBRL(data.low24h) : "..."}
                  </p>
                </div>
                <div>
                  <p className="text-orange-100 text-[9px] sm:text-[10px] mb-0.5">
                    Máxima (24h)
                  </p>
                  <p className="font-bold text-sm sm:text-base">
                    {data ? formatBRL(data.high24h) : "..."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Indication Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-700">O que fazer?</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-orange-500 transition-colors">
                    Ativar Análise
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={showRecommendation}
                      onChange={() => {
                        setShowRecommendation(!showRecommendation);
                        if (!notificationsEnabled)
                          requestNotificationPermission();
                      }}
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </div>
                </label>
              </div>

              {showRecommendation ? (
                <>
                  <div
                    className={`p-4 rounded-2xl ${recommendation.bg} ${recommendation.color} flex flex-col items-center text-center gap-3 mb-4 animate-in fade-in zoom-in duration-300`}
                  >
                    {recommendation.icon}
                    <span className="font-black text-lg leading-tight uppercase">
                      {recommendation.label}
                    </span>
                  </div>

                  <button
                    onClick={handleWhatsAppNotify}
                    className="w-full mb-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-md shadow-green-100"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Notificar no WhatsApp
                  </button>

                  <p className="text-slate-500 text-sm leading-relaxed">
                    Análise baseada na posição do preço atual (R$) em relação às
                    últimas 24h.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <Info className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-slate-400 text-sm font-medium">
                    Ative o checkbox acima para ver a recomendação de mercado.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700 leading-tight">
                <strong>Verde:</strong> Próximo da mínima (bom para comprar).
                <br />
                <strong>Vermelho:</strong> Próximo da máxima (bom para vender ou
                aguardar).
              </p>
            </div>
          </div>
        </div>

        {/* Profit Simulator & Quick Conversion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Simulator */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-6 h-6 text-orange-500" />
              <h3 className="font-bold text-lg text-slate-800">
                Simulador de Lucro
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2">
                  Se eu investir:
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) =>
                      setInvestmentAmount(Number(e.target.value))
                    }
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Comprei o BTC a:
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => data && setPurchasePrice(data.priceBRL)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold transition-colors"
                    >
                      USAR ATUAL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-2">
                    Valor Atual do BTC:
                  </label>
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    <span className="text-orange-400 font-bold text-xs uppercase block mb-1">
                      Mercado Agora
                    </span>
                    <span className="text-xl font-black text-orange-600">
                      {data ? formatBRL(data.priceBRL) : "..."}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-2">
                  Taxa Mercado Pago (%):
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    %
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeFee}
                    onChange={(e) => setExchangeFee(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  A taxa é aplicada na compra e na venda (Ex: 2%)
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500 font-medium">
                    Lucro/Prejuízo Líquido:
                  </span>
                  <span
                    className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {profit >= 0 ? "+" : ""}
                    {profitPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-2xl font-black text-slate-800">
                      {formatBRL(netSaleValue)}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Valor já descontado as taxas
                    </p>
                  </div>
                  <span
                    className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {profit >= 0 ? "LUCRO" : "PERDA"}
                    DE {formatBRL(Math.abs(profit))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Conversion (Editable) */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Wallet className="w-6 h-6 text-orange-500" />
                <h3 className="font-bold text-lg text-slate-800">
                  Conversão Rápida
                </h3>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-500 mb-2">
                  Se eu comprar este valor em R$:
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    value={quickBuyAmount}
                    onChange={(e) => setQuickBuyAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 text-center mb-6">
                <p className="text-orange-400 text-xs font-bold uppercase mb-2 tracking-widest">
                  Você receberia aproximadamente
                </p>
                <div className="text-3xl font-black text-orange-600">
                  {data ? (quickBuyAmount / data.priceBRL).toFixed(8) : "..."}{" "}
                  BTC
                </div>
                <p className="text-orange-500 text-sm font-medium mt-1">
                  ~
                  {data
                    ? Math.round(
                        (quickBuyAmount / data.priceBRL) * 100000000,
                      ).toLocaleString()
                    : "..."}{" "}
                  Satoshis
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-normal">
                    <strong>Satoshi</strong> é a menor unidade do Bitcoin.
                    Imagine que 1 Bitcoin é como 1 real, e os Satoshis são as
                    "moedas de 1 centavo", mas existem 100 milhões deles em cada
                    Bitcoin!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center italic text-slate-400 text-xs">
              "Investir pouco e com frequência é o segredo para o longo prazo."
            </div>
          </div>
        </div>

        {/* Global Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
              Dominância BTC
            </p>
            <p className="text-lg font-bold text-slate-700">
              {data ? `${data.dominance.toFixed(1)}%` : "..."}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
              Market Cap Global
            </p>
            <p className="text-lg font-bold text-slate-700">
              {data ? formatUSD(data.totalMarketCap) : "..."}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
              Volume 24h
            </p>
            <p className="text-lg font-bold text-slate-700">
              {data ? formatUSD(data.volume24h) : "..."}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">
              Status Rede
            </p>
            <div className="flex items-center gap-1.5 text-green-600 font-bold text-sm mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              Normal
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-[1400px] mx-auto px-6 py-12 text-center text-slate-400 text-sm">
        <p>© 2026 CriptoMaster Iniciantes. Dados via CoinGecko.</p>
        <p className="mt-2 text-[10px] uppercase tracking-widest font-bold">
          Não é aconselhamento financeiro.
        </p>
      </footer>
    </div>
  );
}

export default App;
