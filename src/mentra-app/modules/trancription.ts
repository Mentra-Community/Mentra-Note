import { appSession } from '../mentra-app-session'



const unsubscribe = appSession.events.onTranscription(data => {
  console.log(`Transcription: ${data.text}, Final: ${data.isFinal}`)
  if (data.isFinal) {
    // Process the final transcription
  }
})

// Later, to stop receiving events:
unsubscribe()