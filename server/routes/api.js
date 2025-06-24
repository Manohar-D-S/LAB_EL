// Add or update the endpoint to communicate with ESP
app.post('/api/signals/highlight', (req, res) => {
  const { signalId } = req.body;
  
  // Logic to send command to ESP32
  // This depends on how you're communicating with the ESP32
  // Example using HTTP request to ESP32:
  fetch(`http://esp32-ip-address/highlight?signalId=${signalId}`, {
    method: 'GET',
  })
  .then(response => response.json())
  .then(data => {
    res.json({ success: true, message: 'Signal highlighted', data });
  })
  .catch(error => {
    console.error('Error communicating with ESP:', error);
    res.status(500).json({ success: false, message: 'Failed to communicate with ESP' });
  });
});