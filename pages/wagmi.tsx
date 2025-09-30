import { useState, useEffect } from 'react';
import { useAccount, useBalance, useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction, useNetwork, useProvider } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { ERC20_CONTRACT_ADDRESS, ERC20_ABI } from '../lib/web3';
import Head from 'next/head';

export default function WagmiPage() {
  // 状态管理
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [tokenAmount, setTokenAmount] = useState('1');
  const [transferEvents, setTransferEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });

  // 账户和网络信息
  const { address: userAddress, isConnected } = useAccount();
  const { chain } = useNetwork();
  const provider = useProvider();

  // 1. 查询地址余额
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address || userAddress,
    watch: true,
  });

  // 2. 准备发送ETH交易
  const { config: sendEthConfig } = usePrepareContractWrite({
    address: '0x0000000000000000000000000000000000000000', // 发送ETH不需要合约地址
    abi: [],
    functionName: '',
  });

  // 3. 查询ERC20代币合约信息
  const { data: tokenName } = useContractRead({
    address: ERC20_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'name',
  });

  const { data: tokenSymbol } = useContractRead({
    address: ERC20_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
  });

  const { data: tokenDecimals } = useContractRead({
    address: ERC20_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  const { data: tokenTotalSupply } = useContractRead({
    address: ERC20_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });

  // 4. 监听Transfer事件
  useEffect(() => {
    if (!provider || !chain) return;

    const contract = new provider.eth.Contract(ERC20_ABI, ERC20_CONTRACT_ADDRESS);
    
    // 监听Transfer事件
    const handleTransfer = (from: string, to: string, value: any) => {
      setTransferEvents(prev => [
        { from, to, value: formatUnits(value, tokenDecimals || 18), timestamp: new Date() },
        ...prev.slice(0, 9) // 只保留最近10个事件
      ]);
      
      setStatus({
        type: 'info',
        message: `检测到转账: ${from} 向 ${to} 转账 ${formatUnits(value, tokenDecimals || 18)} ${tokenSymbol}`
      });
      
      // 3秒后清除状态消息
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    };

    contract.on('Transfer', handleTransfer);
    
    // 清理函数
    return () => {
      contract.off('Transfer', handleTransfer);
    };
  }, [provider, chain, tokenDecimals, tokenSymbol]);

  // 5. 发送ERC20代币
  const { config: transferTokenConfig } = usePrepareContractWrite({
    address: ERC20_CONTRACT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipient, tokenAmount ? parseUnits(tokenAmount, tokenDecimals || 18) : undefined],
  });

  const { write: transferToken, data: transferTokenData } = useContractWrite(transferTokenConfig);
  
  const { isLoading: isTransferringToken, isSuccess: isTransferTokenSuccess } = useWaitForTransaction({
    hash: transferTokenData?.hash,
  });

  // 发送ETH
  const sendEth = async () => {
    if (!isConnected || !recipient || !amount) {
      setStatus({ type: 'error', message: '请确保已连接钱包并填写收款地址和金额' });
      return;
    }

    try {
      setStatus({ type: 'info', message: '正在发送交易...' });
      
      const tx = await provider.sendTransaction({
        from: userAddress,
        to: recipient,
        value: parseEther(amount),
      });
      
      setStatus({ type: 'info', message: `交易已发送: ${tx.hash}` });
      
      // 等待交易确认
      await tx.wait();
      setStatus({ type: 'success', message: `交易已确认: ${tx.hash}` });
      
      // 重置表单
      setRecipient('');
      setAmount('0.01');
    } catch (error) {
      console.error('发送ETH失败:', error);
      setStatus({ type: 'error', message: `发送失败: ${(error as Error).message}` });
    }
  };

  // 处理交易状态变化
  useEffect(() => {
    if (isTransferTokenSuccess) {
      setStatus({ 
        type: 'success', 
        message: `代币转账成功: ${transferTokenData?.hash}` 
      });
      setRecipient('');
      setTokenAmount('1');
    }
  }, [isTransferTokenSuccess, transferTokenData]);

  return (
    <div>
      <Head>
        <title>Wagmi 示例 | Web3 Demo App</title>
      </Head>
      
      <h1 className="text-3xl font-bold mb-8">Wagmi 示例</h1>
      
      {status.type && (
        <div className={`alert alert-${status.type}`}>
          {status.message}
        </div>
      )}
      
      {!isConnected ? (
        <div className="alert alert-info">
          请连接钱包以使用所有功能
        </div>
      ) : (
        <>
          <p className="mb-6">
            已连接钱包: {userAddress?.substring(0, 6)}...{userAddress?.substring(userAddress.length - 4)}
            <br />
            当前网络: {chain?.name || '未知网络'}
          </p>
        </>
      )}
      
      {/* 1. 查询地址余额 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">1. 查询地址余额</h2>
        <div className="space-y-4">
          <div>
            <label className="label">钱包地址</label>
            <input
              type="text"
              className="input"
              placeholder="输入钱包地址"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <button 
            className="btn" 
            onClick={() => refetchBalance()}
          >
            查询余额
          </button>
          
          {balanceData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p>余额: {formatEther(balanceData.value)} {balanceData.symbol}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 2. 发送ETH交易 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">2. 发送ETH交易</h2>
        <div className="space-y-4">
          <div>
            <label className="label">收款地址</label>
            <input
              type="text"
              className="input"
              placeholder="输入收款地址"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <label className="label">金额 (ETH)</label>
            <input
              type="text"
              className="input"
              placeholder="输入金额"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button 
            className="btn" 
            onClick={sendEth}
            disabled={!isConnected || !recipient || !amount}
          >
            发送ETH
          </button>
        </div>
      </div>
      
      {/* 3. 查询ERC20代币合约信息 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">3. 查询ERC20代币合约信息</h2>
        <p className="mb-4">合约地址: {ERC20_CONTRACT_ADDRESS}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">代币名称</p>
            <p>{tokenName || '加载中...'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">代币符号</p>
            <p>{tokenSymbol || '加载中...'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">小数位数</p>
            <p>{tokenDecimals?.toString() || '加载中...'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">总供应量</p>
            <p>
              {tokenTotalSupply && tokenDecimals 
                ? `${formatUnits(tokenTotalSupply, tokenDecimals)} ${tokenSymbol}` 
                : '加载中...'}
            </p>
          </div>
        </div>
      </div>
      
      {/* 4. 监听Transfer事件 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">4. 监听Transfer事件</h2>
        <p className="mb-4">最近的转账事件:</p>
        
        {transferEvents.length === 0 ? (
          <p className="text-gray-500">暂无转账事件</p>
        ) : (
          <div className="space-y-3">
            {transferEvents.map((event, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-md text-sm">
                <p>
                  {event.from.substring(0, 6)}... → {event.to.substring(0, 6)}...: 
                  {event.value} {tokenSymbol}
                </p>
                <p className="text-gray-500">{event.timestamp.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 5. 发送ERC20代币 */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">5. 发送ERC20代币</h2>
        <div className="space-y-4">
          <div>
            <label className="label">收款地址</label>
            <input
              type="text"
              className="input"
              placeholder="输入收款地址"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <label className="label">代币数量 ({tokenSymbol})</label>
            <input
              type="text"
              className="input"
              placeholder="输入数量"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
            />
          </div>
          <button 
            className="btn" 
            onClick={() => transferToken?.()}
            disabled={!isConnected || !recipient || !tokenAmount || isTransferringToken}
          >
            {isTransferringToken ? '正在转账...' : `发送 ${tokenSymbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}
