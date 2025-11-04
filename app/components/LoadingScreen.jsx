import { Bars } from 'react-loader-spinner'

const LoadingScreen = ({ responseStream }) => {
    return (
        <div className='min-h-screen grid place-items-center bg-gradient-nuanu-primary'>
            <div className='w-[80%] flex flex-col items-center'>
                <div className='flex items-center gap-4'>
                    <Bars width='60' height='60' color='#10b981' />
                    <div className='text-nuanu-green uppercase text-4xl font-bold text-center translate-y-2'>
                        <p className=' animate-pulse'>Preparing Quiz...</p>
                        <p className='text-xs text text-nuanu-green/60'>
                            Loading questions...
                        </p>
                    </div>
                    <Bars width='60' height='60' color='#10b981' />
                </div>
            </div>
        </div>
    )
}
export default LoadingScreen
