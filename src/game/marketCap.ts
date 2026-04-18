import { NOTCOIN_SUPPLY } from './constants'

export function marketCapUsd(price: number): number {
  return price * NOTCOIN_SUPPLY
}
