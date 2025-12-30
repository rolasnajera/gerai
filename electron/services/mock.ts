interface MockResponseResult {
    output_text: string;
    response_id?: string;
    aborted?: boolean;
}

export async function getMockResponse(
    input: string,
    onChunk: (chunk: string) => void,
    abortSignal?: AbortSignal
): Promise<MockResponseResult> {
    const mockResponses = [
        `You said: "${input}"\n\nThis is a **mock response** for testing UI elements.`,
        "I can simulate streaming text just like the real API.",
        "This helps you develop faster without spending any money on API calls.",
        "You can test markdown: \n- List Item 1\n- List Item 2\n\nAnd code blocks:\n```javascript\nconsole.log('Hello from Mock!');\n```",
        "How else can I help you today?"
    ];

    const responseText = mockResponses.join("\n\n");
    const words = responseText.split(' ');
    let accumulatedText = '';
    const responseId = 'mock_' + Date.now();

    return new Promise((resolve) => {
        let wordIndex = 0;

        const interval = setInterval(() => {
            if (abortSignal?.aborted) {
                clearInterval(interval);
                resolve({
                    output_text: accumulatedText,
                    response_id: responseId,
                    aborted: true
                });
                return;
            }

            if (wordIndex < words.length) {
                const chunk = words[wordIndex] + (wordIndex === words.length - 1 ? '' : ' ');
                accumulatedText += chunk;
                onChunk(chunk);
                wordIndex++;
            } else {
                clearInterval(interval);
                resolve({
                    output_text: accumulatedText,
                    response_id: responseId
                });
            }
        }, 50); // Fast but visible streaming
    });
}
