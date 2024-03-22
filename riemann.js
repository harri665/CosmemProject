function calculateRiemannSum() {
    // Retrieve inputs and selected method
    const funcInput = document.getElementById('functionInput').value;
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const n = parseInt(document.getElementById('n').value);
    const method = document.getElementById('method').value;

    
    // Calculate deltaX
    const deltaX = (b - a) / n;
    let sum = 0;

    for (let i = 0; i < n; i++) {
        let x;
        switch (method) {
            case 'left':
                x = a + i * deltaX;
                break;
            case 'right':
                x = a + (i + 1) * deltaX;
                break;
            case 'midpoint':
                x = a + (i + 0.5) * deltaX;
                break;
            default:
                x = a + i * deltaX;
        }
        const f_x = math.evaluate(funcInput.replace(/x/g, `(${x})`));
        sum += f_x * deltaX;
    }
    console.log(deltaX)

    // Display the result and draw the function and rectangles
    document.getElementById('result').textContent = `Riemann Sum: ${sum}`;
    drawFunctionAndRectangles(funcInput, a, b, n, sum, method);
}



function drawFunctionAndRectangles(func, a, b, n, sum, method) {
    const canvas = document.getElementById('myCanvas');
    if (!canvas.getContext) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    //PRE
    const plotPoints = 100;
    const plotDeltaX = (b - a) / plotPoints;
    const funcValues = [];
    for (let i = 0; i <= plotPoints; i++) {
        const x = a + i * plotDeltaX;
        const y = math.evaluate(func.replace(/x/g, `(${x})`));
        funcValues.push({x, y});
    }

    // Scaling
    const maxY = Math.max(...funcValues.map(v => v.y));
    const minY = Math.min(...funcValues.map(v => v.y));
    const scaleX = width / (b - a);
    const scaleY = height / (maxY - minY);
    const originY = height - (0 - minY) * scaleY;

    // Draw the function
    ctx.beginPath();
    ctx.moveTo(0, originY - funcValues[0].y * scaleY);
    funcValues.forEach(point => {
        ctx.lineTo((point.x - a) * scaleX, originY - point.y * scaleY);
    });
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw Riemann rectangles
    for (let i = 0; i < n; i++) {
        let x;
        switch (method) {
            case 'left':
                x = a + i * (b - a) / n;
                break;
            case 'right':
                x = a + (i + 1) * (b - a) / n;
                break;
            case 'midpoint':
                x = a + (i + 0.5) * (b - a) / n;
                break;
            default:
                x = a + i * (b - a) / n;
        }

        const y = math.evaluate(func.replace(/x/g, `(${x})`));
        const rectHeight = Math.abs(y * scaleY);
        const rectY = (y >= 0) ? originY - y * scaleY : originY;

        let rectX = (method === 'right') ? ((x - (b - a) / n) - a) * scaleX : (x - a) * scaleX;
        if (method === 'midpoint') {
            rectX -= ((b - a) / n) * scaleX / 2;
        }

        // Draw the rectangle
        ctx.beginPath();
        ctx.rect(rectX, rectY, (b - a) / n * scaleX, rectHeight);
        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        ctx.fill();
        ctx.stroke();
    }
}

