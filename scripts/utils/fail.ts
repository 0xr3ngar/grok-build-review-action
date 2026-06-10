export const fail = (message: string) => {
    console.log(`::error::${message}`);
    return process.exit(1);
};
