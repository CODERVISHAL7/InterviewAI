(async function () {
  const summary = document.querySelector('[data-interview-summary]');
  const errorBox = document.querySelector('[data-interview-error]');
  const startButton = document.querySelector('[data-start-interview]');
  const generateButton = document.querySelector('[data-generate-questions]');
  const statusBox = document.querySelector('[data-generation-status]');
  if (!summary || !generateButton) return;

  const params = new URLSearchParams(window.location.search);
  const interviewId = params.get('interview_id');
  if (!interviewId) return;

  generateButton.addEventListener('click', async () => {
    generateButton.disabled = true;
    generateButton.textContent = 'Generating questions...';
    if (statusBox) { statusBox.textContent = 'AI is creating your interview questions. This may take a few seconds.'; statusBox.hidden = false; }
    if (errorBox) errorBox.hidden = true;

    try {
      const session = await window.Auth.getSession();
      if (!session) throw new Error('Your session has expired. Please log in again.');

      const { data, error } = await window.supabaseApp.client.functions.invoke('generate-questions', {
        body: { interview_id: interviewId },
      });
      if (error) throw error;
      if (!data?.questions?.length) throw new Error('No questions were generated.');

      if (statusBox) {
        statusBox.textContent = `${data.count} questions generated successfully.`;
        statusBox.dataset.type = 'success';
      }
      generateButton.hidden = true;
      if (startButton) {
        const startUrl = `mock-interview.html?interview_id=${encodeURIComponent(interviewId)}`;
        startButton.dataset.startUrl = startUrl;
        startButton.hidden = false;
        startButton.disabled = false;
        startButton.textContent = 'Start interview →';
        startButton.onclick = (event) => {
          event.preventDefault();
          window.location.assign(startButton.dataset.startUrl);
        };
      }
    } catch (error) {
      console.error(error);
      if (statusBox) statusBox.hidden = true;
      if (errorBox) { errorBox.textContent = error.message || 'Unable to generate questions.'; errorBox.hidden = false; }
      generateButton.disabled = false;
      generateButton.textContent = 'Generate AI questions';
    }
  });
})();
