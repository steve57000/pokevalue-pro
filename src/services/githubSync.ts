import { parseCollection, type CollectionDocument } from '../domain/collection'
import { mergePriceHistory, parsePriceHistoryDocument, type PriceHistoryDocument, type PriceSnapshot } from '../domain/priceHistory'

const API = 'https://api.github.com'
export const PORTFOLIO_PATH = 'collection/v1/portfolio.json'
export const PRICE_HISTORY_PATH = 'price-history/v1/history.json'

export type GitHubConnection = { owner: string; repo: string; token: string }
export type RemotePortfolio = { document?: CollectionDocument; sha?: string; login: string }

async function github<T>(path: string, connection: GitHubConnection, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${connection.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })
  if (!response.ok) {
    const message = response.status === 401 ? 'Jeton expiré, révoqué ou invalide.'
      : response.status === 403 ? 'Le jeton ne possède pas la permission Contents requise.'
      : response.status === 409 ? 'Conflit distant : rechargez puis fusionnez les changements.'
      : `GitHub a répondu ${response.status}.`
    throw Object.assign(new Error(message), { status: response.status })
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export async function readRemotePortfolio(connection: GitHubConnection): Promise<RemotePortfolio> {
  const user = await github<{ login: string }>('/user', connection)
  const path = `/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repo)}/contents/${PORTFOLIO_PATH}`
  try {
    const file = await github<{ content: string; sha: string; encoding: string }>(path, connection)
    const json = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))))
    return { login: user.login, sha: file.sha, document: parseCollection(JSON.parse(json)) }
  } catch (error) {
    if ((error as { status?: number }).status === 404) return { login: user.login }
    throw error
  }
}

export async function writeRemotePortfolio(connection: GitHubConnection, document: CollectionDocument, sha?: string) {
  const content = btoa(unescape(encodeURIComponent(`${JSON.stringify(document, null, 2)}\n`)))
  return github<{ content: { sha: string } }>(
    `/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repo)}/contents/${PORTFOLIO_PATH}`,
    connection,
    { method: 'PUT', body: JSON.stringify({ message: `Sauvegarde collection v1 (révision ${document.revision})`, content, ...(sha ? { sha } : {}) }) },
  )
}

export type RemotePriceHistory = { document?: PriceHistoryDocument; sha?: string }

export async function readRemotePriceHistory(connection: GitHubConnection): Promise<RemotePriceHistory> {
  const path = `/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repo)}/contents/${PRICE_HISTORY_PATH}`
  try {
    const file = await github<{ content: string; sha: string; encoding: string }>(path, connection)
    const json = decodeURIComponent(escape(atob(file.content.replace(/\\n/g, ''))))
    const document = parsePriceHistoryDocument(JSON.parse(json))
    return { document, sha: file.sha }
  } catch (error) {
    if ((error as { status?: number }).status === 404) return {}
    throw error
  }
}

export async function writeRemotePriceHistory(connection: GitHubConnection, snapshots: PriceSnapshot[], sha?: string) {
  const document: PriceHistoryDocument = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    snapshots: mergePriceHistory(snapshots),
  }
  const content = btoa(unescape(encodeURIComponent(`${JSON.stringify(document, null, 2)}\\n`)))
  const result = await github<{ content: { sha: string } }>(
    `/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repo)}/contents/${PRICE_HISTORY_PATH}`,
    connection,
    { method: 'PUT', body: JSON.stringify({ message: `Sauvegarde historique des prix (${document.snapshots.length} relevés)`, content, ...(sha ? { sha } : {}) }) },
  )
  return result.content.sha
}
