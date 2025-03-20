const { ipcRenderer, remote } = require("electron");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const winston = require("winston");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Ajout de la date
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "log/log-renumverstiers.log" }),
  ],
});
function cleanText(text) {
  return text.replace(/[^\w\s]/gi, "");
}

// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
  // alert(__dirname);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      alert("❌ Erreur de lecture du fichier CSV :", err);
      return;
    }
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    let generalData = {};
    let versements = [];
    lines.forEach((line) => {
      const parts = line.split(";").map((part) => part.trim());
      if (parts[0] === "E") {
        try{
          logger.info("Ligne E : " + JSON.stringify(parts, null, 2));
        generalData = {
          identifiantFiscal: parts[1],
          exerciceFiscalDu: parts[2],
          exerciceFiscalAu: parts[3]
        };
      } catch (error) {
        logger.error(
          `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
        );
        alert(
          `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
        );
        return;
      }
      } else if (parts[0] === "D") {
        try{
          logger.info("Ligne D : " + JSON.stringify(parts, null, 2));
        versements.push({
          honoraires: parseFloat(parts[14].replace(",", ".")),
          commissions: parseFloat(parts[15].replace(",", ".")),
          rabais: parseFloat(parts[16].replace(",", ".")),
          honorairesRAS: parseFloat(parts[17].replace(",", ".")),
          commissionsRAS: parseFloat(parts[18].replace(",", ".")),
          montantRetenue: parseFloat(parts[19].replace(",", ".")),
          montantRemun: 0,
          identifiantFiscal: parts[1],
          raisonSociale: cleanText(parts[7]),
          nom: "",
          prenom: "",
          adresse: cleanText(parts[8]),
          numeroTP:parts[9],
          numCNSS:parts[10],
          codeVille:parts[11],
          codeProfession:cleanText (parts[12]),
          codeActivite:"1001",
          numeroCIN:cleanText(parts[2]),
          categorie:parts[4],
         
        });
      } catch (error) {
        logger.error(
          `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
        );
        alert(
          `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
        );
        return;
      }
      }
    });

    callback({ generalData, versements });
  });
}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
  const { generalData, versements } = data;
  const xmlData = {
    DeclarationRVT: {
      identifiantFiscal: generalData.identifiantFiscal,
      exerciceFiscalDu: generalData.exerciceFiscalDu,
      exerciceFiscalAu: generalData.exerciceFiscalAu,
      sommesAllouees: {
        SommeAllouee: versements.map((v) => ({
          honoraires: v.honoraires.toFixed(2),
          commissions: v.commissions.toFixed(2),
          rabais: v.rabais.toFixed(2),
          honorairesRAS: v.honorairesRAS.toFixed(2),
          commissionsRAS: v.commissionsRAS.toFixed(2),
          montantRetenue: v.montantRetenue.toFixed(2),
          montantRemun: v.montantRemun.toFixed(2),
          beneficiaire: {
          identifiantFiscal: v.identifiantFiscal,
          raisonSociale: v.raisonSociale,
          nom: v.nom,
          prenom: v.prenom,
          adresse: v.adresse,
          numeroTP:v.numeroTP,
          numCNSS:v.numCNSS,
          codeVille:v.codeVille,
          codeProfession:v.codeProfession,
          codeActivite:v.codeActivite,
          numeroCIN:v.numeroCIN,
          categorie:v.categorie}
        })),
      },
    },
  };
  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: { pretty: true },
  });
  const xmlContent = builder.buildObject(xmlData);
  const uuid = crypto.randomUUID();
  const fileName = `DECLARATION_TIERS_FINALE_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      logger.error("Erreur lors de la génération du fichier XML :", err);
      alert("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      logger.info(`Fichier XML généré avec succès: ${filePath}`);
      alert(`✅ Fichier XML généré avec succès : ${filePath}`);
    }
  });
}
document.getElementById("convertButtonType1").addEventListener("click", () => {
  ipcRenderer.on("file-opened", (event, filePath) => {
    alert("Fichier ouvert: " + filePath); // Afficher une alerte pour confirmer que le fichier a été ouvert
    readCSV(filePath, (data) => {
      const outputDir = path.dirname(filePath);
      generateXML(data, outputDir);
    });
  });
  //  console.log('Convert button clicked'); // Log pour débogage
  const fileInput = document.getElementById("fileInputType1");
  if (fileInput.files.length === 0) {
    alert("Please select a CSV file first.");
    return;
  }
  const file = fileInput.files[0];
  if (!file) {
    alert("No file selected");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result;
    // const filetrt = __dirname + '/indeclarations/' + file.name;
    const filetrt = "d:/dectva/in/" + file.name;
    readCSV(filetrt, (data) => {
      //   const outputDir = __dirname + '/outdeclarations/';
      const outputDir = "d:/dectva/out/";
      generateXML(data, outputDir);
    });
  };
  reader.readAsText(file);
});
