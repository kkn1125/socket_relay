const convertLangToRegion = (locale) => {
  return new Intl.DisplayNames(["en"], { type: "region" })
    .of(locale.split("-")[1].toUpperCase())
    .split(" ")
    .map((str, idx) => (idx === 0 ? str[0].toLowerCase() + str.slice(1) : str))
    .join("");
};

export { convertLangToRegion };
