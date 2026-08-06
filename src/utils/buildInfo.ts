export const buildSha = import.meta.env.VITE_BUILD_SHA || 'local-dev'
export const buildTime = import.meta.env.VITE_BUILD_TIME || 'local'

export function shortBuildSha() {
  return buildSha.length > 7 ? buildSha.slice(0, 7) : buildSha
}
