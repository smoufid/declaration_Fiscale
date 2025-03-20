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
    new winston.transports.File({ filename: "log/log-renumverstiersnonresident.log" }),
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
    alert("Fichier CSV lu avec succès.");
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
          exerciceFiscalAu: parts[3],
          montantTotalRemuneration: parseFloat(parts[4].replace(",", ".")),
          montantRetenues: parseFloat(parts[5].replace(",", ".")),
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
          montantBrutRemuneration:  parseFloat(parts[11].replace(",", ".")),
          identifiantFiscal: parts[1],
          raisonSociale : cleanText(parts[5]),
          adresse: cleanText(parts[6]),
          ville: cleanText(parts[7]),
          pays: cleanText(parts[8]),
          adresseMaroc: cleanText(parts[9]),
          carteSejour: cleanText(parts[3]),
          numPassport: cleanText(parts[4]),
          numeroCIN: cleanText(parts[2]),
          tauxApplicable:  parts[12] ,
          convention:  parts[13] ,  
          ProduitBrutPercu:   parts[14],
         
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
    alert(versements);
    alert(generalData);
    callback({ generalData, versements });
  });
}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
  const { generalData, versements } = data;
 
  const xmlData = {
    DeclarationRASnonResident: {
      identifiantFiscal: generalData.identifiantFiscal,
      exerciceFiscalDu: generalData.exerciceFiscalDu,
      exerciceFiscalAu: generalData.exerciceFiscalAu,
      montantTotalRemuneration:generalData.montantTotalRemuneration.toFixed(2),
      montantRetenues: generalData.montantRetenues.toFixed(2),
      remunerations: {
        Remuneration: versements.map((v) => ({
          montantBrutRemuneration:  v.montantBrutRemuneration.toFixed(2),
         
          beneficiaire:{
            identifiantFiscal: v.identifiantFiscal,
          raisonSociale : v.raisonSociale,
          adresse: v.adresse,
          ville: v.ville,
          pays: v.pays,
          adresseMaroc: v.adresseMaroc,
          carteSejour: v.carteSejour,
          numPassport: v.numPassport,
          numeroCIN: v.numeroCIN,
          },
          tauxApplicable:{
          id:  v.tauxApplicable ,
          },
          convention:  v.convention ,  
          produitsBrutsPercus:{
            ProduitBrutPercu:{
            id:   v.ProduitBrutPercu,
            }
          }
          
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
  const fileName = `DECLARATION_TIERS_NON_RESIDENTFINALE_${uuid}.xml`;
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
      alert(data); 
      generateXML(data, outputDir);
    });
  };
  reader.readAsText(file);
});
