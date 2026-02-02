import { BetweenVerticalEnd, FolderClosed, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router'

function BottomNavigation() {
  const location = useLocation()

  return (
    <div className='fixed bottom-0 left-0 right-0 h-[70px] bg-[var(--bottom-nav)] flex items-center justify-evenly'>
      <Link to="/">
        <FolderClosed size={30} className={location.pathname === '/' ? 'text-black' : 'text-gray-400'} />
      </Link>
      <Link to="/action" className='bg-black rounded-full p-[20px] -mt-[30px]'>
        <BetweenVerticalEnd size={30} color='white' />
      </Link>
      <Link to="/settings">
        <Settings size={30} className={location.pathname === '/settings' ? 'text-black' : 'text-gray-400'} />
      </Link>
    </div>
  )
}

export default BottomNavigation
