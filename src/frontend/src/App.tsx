import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
          Tailwind + React
        </h1>

        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 mb-6">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="w-full bg-white text-purple-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors duration-200 shadow-md"
          >
            Count idsadass {count}
          </button>
        </div>

        <p className="text-gray-600 text-center text-sm">
          Edfdsfsdfsdfdit <code className="bg-gray-100 px-2 py-1 rounded">App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  )
}

export default App
