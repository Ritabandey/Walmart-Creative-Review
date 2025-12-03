async function runCheck() {
    const fileInput = document.getElementById("imageUpload");
    const output = document.getElementById("output");

    if (!fileInput.files.length) {
        output.textContent = "Please upload an image first.";
        return;
    }

    const imageFile = fileInput.files[0];

    // This tells Copilot to read the image
    const analysis = await ai.analysis.toText(imageFile, { prompt: await fetch("prompt.txt").then(r => r.text()) });

    output.textContent = analysis;
}
