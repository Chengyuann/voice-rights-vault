import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Network } from '@provablehq/aleo-types'
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react'
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/bodoni-moda/latin-500.css'
import '@fontsource/bodoni-moda/latin-500-italic.css'
import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/dm-serif-display/latin-400-italic.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import '@fontsource/ibm-plex-mono/latin-700.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/manrope/latin-800.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/unbounded/latin-500.css'
import '@fontsource/unbounded/latin-600.css'
import './index.css'
import App from './App.tsx'

const walletAdapters = [new ShieldWalletAdapter()]
const programId = import.meta.env.VITE_ALEO_PROGRAM_ID || 'voice_rights_v1.aleo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AleoWalletProvider
      wallets={walletAdapters}
      network={Network.TESTNET}
      programs={[programId]}
      autoConnect
      onError={(error) => {
        window.dispatchEvent(new CustomEvent('aleo-wallet-error', { detail: error.message }))
      }}
    >
      <App />
    </AleoWalletProvider>
  </StrictMode>,
)
