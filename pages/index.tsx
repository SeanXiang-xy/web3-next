import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <Head>
        <title>Web3 Demo App</title>
        <meta name="description" content="Web3 Demo with Wagmi, Ethers.js and Viem" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-6">Web3 Demo App</h1>
        <p className="text-xl text-gray-600 mb-8">
          探索 Wagmi, Ethers.js 和 Viem 的使用方法
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/wagmi" className="btn">
            查看 Wagmi 示例
          </Link>
          <Link href="/ethers" className="btn">
            查看 Ethers.js 示例
          </Link>
          <Link href="/viem" className="btn">
            查看 Viem 示例
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Wagmi</h2>
          <p className="text-gray-600">
            Wagmi 是一个 React Hooks 库，用于与以太坊交互，提供了简洁的 API 和丰富的功能。
          </p>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Ethers.js</h2>
          <p className="text-gray-600">
            Ethers.js 是一个轻量级的以太坊库，提供了与区块链交互的核心功能。
          </p>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-semibold mb-3">Viem</h2>
          <p className="text-gray-600">
            Viem 是一个现代的以太坊库，设计简洁、高效，提供了类型安全的 API。
          </p>
        </div>
      </div>
    </div>
  );
}
