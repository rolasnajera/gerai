interface MockResponseResult {
    output_text: string;
    response_id?: string;
    aborted?: boolean;
    citations?: any[];
}

export async function getMockResponse(
    input: string,
    onChunk: (chunk: string) => void,
    abortSignal?: AbortSignal
): Promise<MockResponseResult> {
    const mockResponses = [
        `You said: "${input}"\n\nThis is a **mock response** for testing UI elements and scrolling behavior.`,
        "### Section 1: The Importance of Scrolling\n\nScrolling is a fundamental interaction in modern web applications. When content exceeds the visible area of the screen, scrollbars allow users to navigate through the information at their own pace. In a chat application, this is particularly critical because conversations can grow to be very long.",
        "### Section 2: Testing Large Data Sets\n\nTo ensure the application remains responsive and the UI stays consistent, we need to test it with significantly more text than we expect in a typical short interaction. This allows us to verify that our new 'smart autoscroll' feature works as intended: staying at the bottom when you want it to, but letting you scroll up to read previous parts of the message without jumping back.",
        "### Section 3: Technical Details\n\nImplementing a robust autoscroll requires a few key pieces of information:\n1. The current scroll position (`scrollTop`)\n2. The total height of the content (`scrollHeight`)\n3. The height of the viewing window (`clientHeight`)\n\nBy comparing these values, the application can determine if the user is currently at the 'bottom' of the chat and decide whether to automatically pull the view down as new tokens arrive from the streaming response.",
        "### Section 4: User Experience\n\nGood UX is about respecting the user's intent. If a user manually scrolls up, it's a strong signal that they want to read something specific. Forcing them back to the bottom every time a single word is added to the response is frustrating and counterproductive. Our implementation fixes this by only activating autoscroll when the user is already near the bottom or manually requests it via the new 'Scroll to Bottom' button.",
        "### Section 5: Markdown and Formatting\n\nLet's add some more formatting to see how the markdown parser handles larger blocks:\n\n- **Feature A**: Automatic detection of manual scroll.\n- **Feature B**: Floating resume-autoscroll button.\n- **Feature C**: Visual streaming indicator.\n\nNow, here is a long block of text to fill even more space: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        "### Conclusion\n\nThis large mock response should now properly trigger the scroll container and allow you to test the new functionality thoroughly. Happy testing!",
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
