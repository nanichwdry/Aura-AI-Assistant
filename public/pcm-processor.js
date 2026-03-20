/**
 * AudioWorklet processor for low-latency PCM mic capture.
 * Runs on the audio rendering thread — sends Float32 frames to App.tsx
 * via the MessagePort, which converts them to Int16 PCM before sending
 * to the Gemini Live API.
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      // Clone the typed array so the buffer isn't recycled before the
      // main thread reads it.
      this.port.postMessage(input[0].slice());
    }
    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
