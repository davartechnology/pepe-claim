/**
 * Retourne un entier aléatoire entre min et max (inclus)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Retourne true avec une probabilité donnée (0 à 1)
 */
function randomChance(probability) {
    return Math.random() < probability;
}

/**
 * Choisit un élément aléatoire dans un tableau
 */
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { randomInt, randomChance, randomChoice };