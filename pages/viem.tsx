import { useState, useEffect } from 'react';
import { useAccount, useNetwork, useProvider } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits, watchContractEvent } from 'viem';
import { writeContract, readContract, sendTransaction, waitForTransaction } from 'wagmi/actions';
import { ERC20_CONTRACT_ADDRESS, ERC20_ABI } from '../lib/web3';
import Head from 'next/head';

export default function ViemPage() {
  // 状态管理
  const [address, setAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [tokenAmount, setTokenAmount] = useState('1');
  const [balance, setBalance] = useState<string | null>(null);
  const [transferEvents, setTransferEvents] = useState<any[]>([]);
  const [tokenInfo, setTokenInfo] = useState({
    name: '',
    symbol: '',
    decimals: 18,
    totalSupply: ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [isLoading, setIsLoading] = useState(false);

  // 账户和网络信息
  const { address: userAddress, isConnected } = useAccount();
  const { chain } = useNetwork();
  const provider = useProvider();

  // 初始化 - 加载代币信息和设置事件监听
  useEffect(() => {
    if (!chain) return;
    
    // 加载代币信息
    loadTokenInfo();
    
    // 设置事件监听
    const unwatch = watchContractEvent({
      address: ERC20_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      eventName: 'Transfer',
      onLogs: (logs) => {
        logs.forEach(log => {
          const { args } = log;
          if (args) {
            setTransferEvents(prev => [
              { 
                from: args.from, 
                to: args.to, 
                value: formatUnits(args.value, tokenInfo.decimals), 
                timestamp: new Date() 
              },
              ...prev.slice(0, 9) // 只保留最近10个事件
            ]);
            
            setStatus({
              type: 'info',
              message: `检测到转账: ${args.from} 向 ${args.to} 转账 ${formatUnits(args.value, tokenInfo.decimals)} ${tokenInfo.symbol}`
            });
            
            // 3秒后清除状态消息
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
          }
        });
      }
    });
    
    // 清理函数
    return () => {
      unwatch();
    };
  }, [chain, tokenInfo.decimals, tokenInfo.symbol]);

  // 加载代币信息
  const loadTokenInfo = async () => {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        readContract({
          address: ERC20_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
        readContract({
          address: ERC20_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        readContract({
          address: ERC20_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
        readContract({
          address: ERC20_CONTRACT_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'totalSupply',
        }),
      ]);
      
      setTokenInfo({
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: formatUnits(totalSupply as bigint, decimals as number)
      });
    } catch (error) {
      console.error('加载代币信息失败:', error);
      setStatus({ type: 'error', message: '加载代币信息失败' });
    }
  };

  // 1. 查询地址余额
  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      const targetAddress = address || userAddress;
      if (!targetAddress) {
        setStatus({ type: 'error', message: '请输入地址' });
        setIsLoading(false);
        return;
      }
      
      const balance = await provider.getBalance(targetAddress);
      setBalance(formatEther(balance));
      setStatus({ type: 'success', message: '余额查询成功' });
    } catch (error) {
      console.error('查询余额失败:', error);
      setStatus({ type: 'error', message: `查询失败: ${(error as Error).message}` });
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 发送ETH交易
  const sendEth = async () => {
    if (!isConnected || !recipient || !amount) {
      setStatus({ type: 'error', message: '请确保已连接钱包并填写收款地址和金额' });
      return;
    }
    
    try {
      setIsLoading(true);
      setStatus({ type: 'info', message: '正在发送交易...' });
      
      const hash = await sendTransaction({
        to: recipient,
        value: parseEther(amount),
      });
      
      setStatus({ type: 'info', message: `交易已发送: ${hash}` });
      
      // 等待交易确认
      await waitForTransaction({ hash });
      setStatus({ type: 'success', message: `交易已确认: ${hash}` });
      
      // 重置表单
      setRecipient('');
      setAmount('0.01');
    } catch (error) {
      console.error('发送ETH失败:', error);
      setStatus({ type: 'error', message: `发送失败: ${(error as Error).message}` });
    } finally {
      setIsLoading(false);
    }
  };

  // 5. 发送ERC20代币
  const transferToken = async () => {
    if (!isConnected || !recipient || !tokenAmount) {
      setStatus({ type: 'error', message: '请确保已连接钱包并填写收款地址和数量' });
      return;
    }
    
    try {
      setIsLoading(true);
      setStatus({ type: 'info', message: '正在发送代币...' });
      
      const hash = await writeContract({
        address: ERC20_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          recipient,
          parseUnits(tokenAmount, tokenInfo.decimals)
        ],
      });
      
      setStatus({ type: 'info', message: `代币转账已发送: ${hash}` });
      
      // 等待交易确认
      await waitForTransaction({ hash });
      setStatus({ type: 'success', message: `代币转账已确认: ${hash}` });
      
      // 重置表单
      setRecipient('');
      setTokenAmount('1');
    } catch (error) {
      console.error('发送代币失败:', error);
      setStatus({ type: 'error', message: `发送失败: ${(error as Error).message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Viem 示例 | Web3 Demo App</title>
      </Head>
      
      <h1 className="text-3xl font-bold mb-8">Viem 示例</h1>
      
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
            onClick={fetchBalance}
            disabled={isLoading}
          >
            {isLoading ? '查询中...' : '查询余额'}
          </button>
          
          {balance !== null && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p>余额: {balance} ETH</p>
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
            disabled={!isConnected || !recipient || !amount || isLoading}
          >
            {isLoading ? '发送中...' : '发送ETH'}
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
            <p>{tokenInfo.name || '加载中...'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">代币符号</p>
            <p>{tokenInfo.symbol || '加载中...'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">小数位数</p>
            <p>{tokenInfo.decimals}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="font-medium">总供应量</p>
            <p>
              {tokenInfo.totalSupply} {tokenInfo.symbol}
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
                  {event.value} {tokenInfo.symbol}
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
            <label className="label">代币数量 ({tokenInfo.symbol})</label>
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
            onClick={transferToken}
            disabled={!isConnected || !recipient || !tokenAmount || isLoading}
          >
            {isLoading ? '正在转账...' : `发送 ${tokenInfo.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}
