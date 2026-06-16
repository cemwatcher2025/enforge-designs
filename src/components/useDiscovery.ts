import { useContext } from 'react'
import { DiscoveryContext } from '../utils/discoveryContext'

export function useDiscovery() {
  const context = useContext(DiscoveryContext)
  if (!context) throw new Error('useDiscovery must be used inside DiscoveryProvider')
  return context
}
