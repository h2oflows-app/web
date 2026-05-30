export function gaugeSourceUrl(source: string, externalId: string): string | null {
  switch (source) {
    case 'usgs': return `https://waterdata.usgs.gov/monitoring-location/${externalId}/`
    case 'dwr':  return `https://dwr.state.co.us/Tools/Stations/${externalId}`
    default:     return null
  }
}
