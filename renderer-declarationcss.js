const { ipcRenderer, remote } = require('electron');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
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
    new winston.transports.File({ filename: "log/log-declarationcss.log" }),
  ],
});
function cleanText(text) {
    return text.replace(/[^\w\s]/gi, '');
}
function getMonthNumber(monthName) {
    const months = {
        "janvier": 1, "fevrier": 2, "mars": 3, "avril": 4,
        "mai": 5, "juin": 6, "juillet": 7, "aout": 8,
        "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12
    };

    return months[monthName.toLowerCase()] || "0";
}
function formatDate(dateStr) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
    fs.readFile(filePath, "latin1", (err, data) => {
        if (err) {
            alert("❌ Erreur de lecture du fichier CSV :", err);
            return;
        }
        const lines = data.split("\n").map(line => line.trim()).filter(line => line !== "");
        let generalData = {};
        let personnels = [];
        let virements = [];

        lines.forEach(line => {
            const parts = line.split(";").map(part => part.trim());
            if (parts[0] === "E") {
                try {
                    logger.info("Ligne E : " + JSON.stringify(parts, null, 2));
                generalData = {
                    identifiantFiscal: parts[1],
                    raisonSociale: 'AGENCE NATIONALE DES PORTS',
                    exerciceFiscalDu: parts[2].replaceAll('/', '-'),
                    exerciceFiscalAu: parts[3].replaceAll('/', '-'),
                    annee: parts[4],
                    totalMontantSalaireNetImpot: parseFloat(parts[5].trim().replace(",", ".")),
                    totalMontantContribution: parseFloat(parts[6].trim().replace(",", ".")),
                    totalContributionVerse: parseFloat(parts[7].trim().replace(",", ".")),
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
                try {
                    logger.info("Ligne D : " + JSON.stringify(parts, null, 2));
                personnels.push({
                    numeroMatricule: (parts[1].trim()), // Nettoyage du texte
                    nom: parts[2].trim(),
                    prenom: (parts[3].trim()), // Nettoyage du texte
                    numCNI: (parts[4].trim()), // Nettoyage du texte
                    numCE: cleanText(parts[5].trim()), // Nettoyage du texte
                    montantSalaireNetImpot: parseFloat(parts[6].trim().replace(",", ".")),
                    montantContribution: parseFloat(parts[7].trim().replace(",", "."))
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
            else if (parts[0] === "P") {
                try {
                    logger.info("Ligne P : " + JSON.stringify(parts, null, 2));
                virements.push({
                    mois: getMonthNumber(parts[1].trim()),
                    montantContributionVersee: parseFloat(parts[2].trim().replace(",", ".")),
                    dateVersement: formatDate(parts[3].trim()),
                    contributionVersee: parseFloat(parts[4].trim().replace(",", ".")),
                    dateVersementd: formatDate(parts[5].trim()),
                    numQuittance: parts[6].trim(),
                    refMoyenPaiement: 'VM'
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
        callback({ generalData, personnels, virements });
    });

}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
 
    const { generalData, personnels, virements } = data;
    const namespaces = {
        xsi: 'http://www.w3.org/2001/XMLSchema-instance',
    };
    const xmlData = {
        DecEmployDebirCSSBR: {
            $: {
                'xmlns:xsi': namespaces.xsi,
                'xsi:noNamespaceSchemaLocation': 'DecEmployDebirCSSBR.xsd',
            },
            identifiantFiscal: generalData.identifiantFiscal,
            raisonSociale: generalData.raisonSociale,
            exerciceFiscalDu: generalData.exerciceFiscalDu,
            exerciceFiscalAu: generalData.exerciceFiscalAu,
            annee: generalData.annee,
            totalMontantSalaireNetImpot: generalData.totalMontantSalaireNetImpot.toFixed(2),
            totalMontantContribution: generalData.totalMontantContribution.toFixed(2),
            totalContributionVerse: generalData.totalContributionVerse.toFixed(2),
        }
    };
     if (personnels.length > 0) {
        xmlData.DecEmployDebirCSSBR.beneficiaires = {
            BeneficiaireRevSalAssCSSBR: personnels.map(v => ({
                numeroMatricule: v.numeroMatricule, // Nettoyage du texte
                nom: v.nom.trim(),
                prenom: v.prenom.trim(), // Nettoyage du texte
                numCNI: v.numCNI, // Nettoyage du texte
                numCE: v.numCE, // Nettoyage du texte
                montantSalaireNetImpot: v.montantSalaireNetImpot.toFixed(2),
                montantContribution: v.montantContribution.toFixed(2),
            }))
        };
    }
        if (virements.length > 0) {
            xmlData.DecEmployDebirCSSBR.detailsVersement = {
                DetailVersementEmployDebirCSSBR: virements.map(v => ({
                    mois: v.mois,
                    montantContributionVersee: v.montantContributionVersee.toFixed(2),
                    dateVersement:v.dateVersement,
                    listDetailPaiement :{
                        DetailPaiementEmployDebirCSSBR:{
                            contributionVersee:v.contributionVersee.toFixed(2),
                            dateVersementd: v.dateVersementd,
                            numQuittance: v.numQuittance,
                            refMoyenPaiement:{
                                code:v.refMoyenPaiement
                            }
                        }
                    }
                }))
            };
        }
    const builder = new xml2js.Builder({ headless: false, renderOpts: { pretty: true } });
    const xmlContent = builder.buildObject(xmlData);
    const uuid = crypto.randomUUID();
    const fileName = `CSS_CSSBR_${uuid}.xml`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFile(filePath, xmlContent, (err) => {
        if (err) {
            logger.error(`❌ Erreur lors de la génération du fichier XML : ${err.message}`, err);
            alert("❌ Erreur lors de la génération du fichier XML :", err);
        } else {
            logger.info(`Fichier XML généré avec succès: ${filePath}`);
            alert(`✅ Fichier XML généré avec succès : ${filePath}`);
        }
    });
}
// Écouter l'événement 'file-opened' envoyé depuis main.js
document.getElementById('convertButtonType1').addEventListener('click', () => {
    ipcRenderer.on('file-opened', (event, filePath) => {
        alert('Fichier ouvert: ' + filePath);  // Afficher une alerte pour confirmer que le fichier a été ouvert
        readCSV(filePath, (data) => {
            const outputDir = path.dirname(filePath);
            generateXML(data, outputDir);
        });
    });
    // console.log('Convert button clicked'); // Log pour débogage
    const fileInput = document.getElementById('fileInputType1');
    if (fileInput.files.length === 0) {
        alert('Please select a CSV file first.');
        return;
    }
    const file = fileInput.files[0];
    if (!file) {
        alert('No file selected');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        const csvData = e.target.result;
        // const filetrt = __dirname + '/indeclarations/' + file.name;
        const filetrt = 'd:/dectva/in/' + file.name;
        // alert('Fichier ouvert: ' + filetrt);
        // Passer les données CSV lues pour traitement
        readCSV(filetrt, (data) => {
            //  const outputDir = __dirname + '/outdeclarations/';
            const outputDir = 'd:/dectva/out/';
            generateXML(data, outputDir);
        });
    };
    reader.readAsText(file);
});
