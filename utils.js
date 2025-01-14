function put(str) {
    process.stdout.write(str);
}

function pl(...mes) {
    console.log(...mes);
}

module.exports = {pl, put};

