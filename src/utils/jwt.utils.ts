import { JWT_SECRET } from '@config'
import * as jwt from 'jsonwebtoken'

export const signJwt = <T extends object>(
  payload: T,
  expiresIn: string | number = 60 * 60,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, JWT_SECRET, { expiresIn, algorithm: 'HS256' }, (error, token) => {
      if (error) {
        reject(error)
      }
      resolve(token)
    })
  })
}

export const verifyJwt = <T>(token: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (error, decoded) => {
      if (error) {
        reject(error)
      }
      resolve(decoded as T)
    })
  })
}
