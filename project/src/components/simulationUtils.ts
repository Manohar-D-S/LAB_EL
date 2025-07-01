// simulationUtils.ts
export const notifyEsp32Proximity = async (junction: string, direction: string, esp32Ip: string) => {
  return fetch(`http://${esp32Ip}/proximity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ junction, direction }),
  });
};