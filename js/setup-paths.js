// Скрипт для автоматической настройки путей при деплое
const fs = require('fs');
const path = require('path');

const htmlFiles = [
    'index.html',
    'login.html', 
    'register.html',
    'diary.html',
    'add-medication.html'
];

htmlFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Обновляем пути к скриптам
    content = content.replace(
        /<script type="module">\s*import { (.*?) } from '(.*?)';\s*(.*?)<\/script>/g,
        `<script type="module">
    const basePath = window.location.hostname.includes('github.io') ? '/medication-diary' : '';
    
    import(basePath + '$2').then(module => {
        module.$1();
    }).catch(error => {
        console.error('Error loading module:', error);
        import('$2').then(module => {
            module.$1();
        });
    });
</script>`
    );
    
    // Обновляем пути к CSS
    content = content.replace(
        /<link rel="stylesheet" href="(.*?)">/g,
        '<link rel="stylesheet" href="' + '$1' + '">'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated paths in ${file}`);
});

console.log('All paths updated for GitHub Pages!');