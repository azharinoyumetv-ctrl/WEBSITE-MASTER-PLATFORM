import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prompt, type, context, tone } = body

    if (process.env.OPENAI_API_KEY) {
      // Basic OpenAI integration if key is present
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt || `Generate a ${tone} ${type} about ${context}` }]
        })
      })
      const data = await res.json()
      return NextResponse.json({ result: data.choices[0].message.content })
    }

    // Dummy response if no key is found
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    let dummyResponse = ''
    if (type) {
      dummyResponse = `Here is your ${tone} ${type} about ${context}:\n\nThis is a highly optimized, conversion-focused piece of content tailored for your audience. Enjoy!\n\n(Note: Set OPENAI_API_KEY in your .env to enable real AI generation.)`
    } else {
      dummyResponse = `Here is a drafted response based on your request: "${prompt}".\n\n(Note: Set OPENAI_API_KEY in your .env to enable real AI generation.)`
    }

    return NextResponse.json({ result: dummyResponse })

  } catch (error: any) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}
