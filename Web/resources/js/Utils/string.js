export const capitalizeWords = (text) => {
    if (!text) return '';

    return text
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};