const { ipcRenderer, remote } = require("electron");
const fs = require("fs");
const path = require("path");
const { json } = require("stream/consumers");
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
    new winston.transports.File({ filename: "log/log-declarationir.log" }),
  ],
});

//const config = require('../config.json');
// Fonction pour nettoyer le texte
function cleanText(text) {
  return text.replace(/[^\w\s]/gi, "");
}
function formatDate(dateStr) {
  const [day, month, year] = dateStr.split("/");
  const date = new Date(year, month - 1, day); // Les mois commencent à 0 dans l'objet Date
  const formattedDate = date.toISOString().split("T")[0];
  return formattedDate;
}
function recupererElementsExo(lines, matricule) {
  let elementsExo = [];
  lines.forEach((line) => {
    const parts = line.split(";").map((part) => part.trim());
    if (parts[1] === matricule) {
      elementsExo.push({
        montantExonere: parseFloat(parts[7].trim().replace(",", ".")),
        refNatureElementExonere: parts[5].trim(),
      });
    }
  });
  return elementsExo;
}
function recupererCasSportif(val) {
  return val === "1" ? "true" : "false";
}
// Fonction pour lire le fichier CSV
function readCSV(filePath, callback) {
  fs.readFile(filePath, "latin1", (err, data) => {
    if (err) {
      alert("❌ Erreur de lecture du fichier CSV :", err);
      return;
    }
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    let generalData = {};
    let occasionnels = [];
    let virements = [];
    let permanents = [];
    lines.forEach((line) => {
      try {
        const parts = line.split(";").map((part) => part.trim());
        if (parts[0] === "ID") {
          try {
            logger.info("Ligne ID : " + JSON.stringify(parts, null, 2));
            Object.assign(generalData, {
              identifiantFiscal: parts[1].trim(),
              nom: cleanText(parts[2].trim()),
              prenom: cleanText(parts[3].trim()),
              raisonSociale: cleanText(parts[4].trim()),
              exerciceFiscalDu: formatDate(parts[5].trim()),
              exerciceFiscalAu: formatDate(parts[6].trim()),
              annee: parts[7].trim(),
              commune: parts[8].trim(),
              adresse: cleanText(parts[9].trim()),
              numeroCIN: "",
              numeroCNSS: "",
              numeroCE: "",
              numeroRC: "",
              identifiantTP: parts[16].trim(),
              numeroFax: parts[14].trim(),
              numeroTelephone: parts[15].trim(),
              email: parts[17].trim(),
              
            });
          } catch (error) {
            logger.error( 
              `Erreur lors du traitement de la ligne: ${line}.  Erreur detaille: ${error.message}`
            );
            alert(
              `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
            );
            return;
          }
        }
        if (parts[0] === "EF") {
          try {
            logger.info("Ligne EF : " + JSON.stringify(parts, null, 2));
            Object.assign(generalData, {
              effectifTotal: parts[1].trim(),
              nbrPersoPermanent: parts[2].trim(),
              nbrPersoOccasionnel: parts[3].trim(),
              nbrStagiaires: parts[4].trim(),
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
        if (parts[0] === "TT") {
          try {
            logger.info("Ligne TT : " + JSON.stringify(parts, null, 2));
            Object.assign(generalData, {
              totalMtRevenuBrutImposablePP: parseFloat(
                parts[1].trim().replace(",", ".")
              ),
              totalMtRevenuNetImposablePP: parseFloat(
                parts[2].trim().replace(",", ".")
              ),
              totalMtTotalDeductionPP: parseFloat(
                parts[3].trim().replace(",", ".")
              ),
              totalMtIrPrelevePP: parseFloat(parts[4].trim().replace(",", ".")),
              totalMtBrutSommesPO: parseFloat(
                parts[5].trim().replace(",", ".")
              ),
              totalIrPrelevePO: parseFloat(parts[6].trim().replace(",", ".")),
              totalMtBrutTraitSalaireSTG: parseFloat(
                parts[7].trim().replace(",", ".")
              ),
              totalMtBrutIndemnitesSTG: parseFloat(
                parts[8].trim().replace(",", ".")
              ),
              totalMtRetenuesSTG: parseFloat(parts[9].trim().replace(",", ".")),
              totalMtRevenuNetImpSTG: parseFloat(
                parts[10].trim().replace(",", ".")
              ),
              totalSommePayeRTS: parseFloat(parts[11].trim().replace(",", ".")),
              totalmtAnuuelRevenuSalarial: parseFloat(
                parts[12].trim().replace(",", ".")
              ),
              totalmtAbondement: parseFloat(parts[13].trim().replace(",", ".")),
              montantPermanent: parseFloat(parts[14].trim().replace(",", ".")),
              montantOccasionnel: parseFloat(
                parts[15].trim().replace(",", ".")
              ),
              montantStagiaire: parseFloat(parts[16].trim().replace(",", ".")),
              referenceDeclaration: parts[17].trim(),
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
        if (parts[0] === "OC") {
          try {
            logger.info("Ligne OC : " + JSON.stringify(parts, null, 2));
            occasionnels.push({
              nom: cleanText(parts[1].trim()), // Nettoyage du texte
              prenom: cleanText(parts[2].trim()),
              adressePersonnelle: cleanText(parts[3].trim()), // Nettoyage du texte
              numCNI: parts[4].trim(), // Nettoyage du texte
              numCE: cleanText(parts[5].trim()), // Nettoyage du texte
              ifu: parts[6].trim(),
              mtBrutSommes: parseFloat(parts[7].trim().replace(",", ".")),
              irPreleve: parseFloat(parts[8].trim().replace(",", ".")),
              profession: cleanText(parts[9].trim()),
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
        if (parts[0] === "RS") {
          try {
            logger.info("Ligne RS : " + JSON.stringify(parts, null, 2));
            virements.push({
              mois: parts[1].trim(),
              totalVersement: parseFloat(parts[2].trim().replace(",", ".")),
              dateDerniereVersment: formatDate(parts[3].trim()),
              reference: parts[4].trim(),
              totalVerse: parseFloat(parts[5].trim().replace(",", ".")),
              principal: parseFloat(parts[6].trim().replace(",", ".")),
              penalite: parseFloat(parts[7].trim().replace(",", ".")),
              majorations: parseFloat(parts[8].trim().replace(",", ".")),
              dateVersement: formatDate(parts[9].trim()),
              refMoyenPaiement: parts[10].trim(),
              numQuittance: parts[11].trim(),
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

        if (parts[0] === "PP") {
          try {
            logger.info("Ligne PP : " + JSON.stringify(parts, null, 2));
            permanents.push({
              nom: cleanText(parts[1].trim()), // Nettoyage du texte parts[1].trim(),
              prenom: cleanText(parts[2].trim()),
              adressePersonnelle: cleanText(parts[3].trim()),
              numCNI: parts[4].trim(),
              numCE: parts[5].trim(),
              numPPR: parts[6].trim(),
              numCNSS: parts[7].trim(),
              ifu: parts[8].trim(),
              salaireBaseAnnuel: parseFloat(parts[29].trim().replace(",", ".")),
              mtBrutTraitementSalaire: parseFloat(
                parts[9].trim().replace(",", ".")
              ),
              periode: parts[10].trim(),
              mtExonere: parseFloat(parts[11].trim().replace(",", ".")),
              mtEcheances: parseFloat(parts[12].trim().replace(",", ".")),
              nbrReductions: parseFloat(parts[13].trim().replace(",", ".")),
              mtIndemnite: parseFloat(parts[14].trim().replace(",", ".")),
              mtAvantages: parseFloat(parts[15].trim().replace(",", ".")),
              mtRevenuBrutImposable: parseFloat(
                parts[16].trim().replace(",", ".")
              ),
              mtFraisProfess: parseFloat(parts[17].trim().replace(",", ".")),
              mtCotisationAssur: parseFloat(parts[18].trim().replace(",", ".")),
              mtAutresRetenues: parseFloat(parts[19].trim().replace(",", ".")),
              mtRevenuNetImposable: parseFloat(
                parts[20].trim().replace(",", ".")
              ),
              mtTotalDeduction: parseFloat(parts[21].trim().replace(",", ".")),
              irPreleve: parseFloat(parts[22].trim().replace(",", ".")),
              casSportif: recupererCasSportif(parts[23].trim()),
              numMatricule: parts[24].trim(),
              datePermis: "",
              dateAutorisation: "",
              refSituationFamiliale: parts[27].trim(),
              refTaux: parts[28].trim(),
              elementsexo: recupererElementsExo(
                lines.filter((line) => line.startsWith("XO")),
                parts[24].trim()
              ),
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
      } catch (error) {
        logger.error(
          `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
        );
        alert(
          `Erreur lors du traitement de la ligne: ${line}. Erreur: ${error.message}`
        );
        return;
      }
    });
    callback({ generalData, occasionnels, virements, permanents });
  });
}
// Fonction pour générer le fichier XML
function generateXML(data, outputDir) {
  const { generalData, occasionnels, virements, permanents } = data;

  //  alert(JSON.stringify(generalData));

  const namespaces = {
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
  };
  const xmlData = {
    TraitementEtSalaire: {
      $: {
        "xmlns:xsi": namespaces.xsi,
      },

      identifiantFiscal: generalData.identifiantFiscal.trim(),
      nom: generalData.nom.trim(),
      prenom: generalData.prenom.trim(),
      raisonSociale: generalData.raisonSociale.trim(),
      exerciceFiscalDu: generalData.exerciceFiscalDu.trim(),
      exerciceFiscalAu: generalData.exerciceFiscalAu.trim(),
      annee: generalData.annee.trim(),
      commune: {
        code: generalData.commune.trim(),
      },
      adresse: generalData.adresse.trim(),
      numeroCIN: "",
      numeroCNSS: "",
      numeroCE: "",
      numeroRC: "",
      identifiantTP: generalData.identifiantTP.trim(),
      numeroFax: generalData.numeroFax.trim(),
      numeroTelephone: generalData.numeroTelephone.trim(),
      email: generalData.email.trim(),
      effectifTotal: generalData.effectifTotal,
      nbrPersoPermanent: generalData.nbrPersoPermanent,
      nbrPersoOccasionnel: generalData.nbrPersoOccasionnel,
      nbrStagiaires: generalData.nbrStagiaires,
      totalMtRevenuBrutImposablePP:
        generalData.totalMtRevenuBrutImposablePP.toFixed(2),
      totalMtRevenuNetImposablePP:
        generalData.totalMtRevenuNetImposablePP.toFixed(2),
      totalMtTotalDeductionPP: generalData.totalMtTotalDeductionPP.toFixed(2),
      totalMtIrPrelevePP: generalData.totalMtIrPrelevePP.toFixed(2),
      totalMtBrutSommesPO: generalData.totalMtBrutSommesPO.toFixed(2),
      totalIrPrelevePO: generalData.totalIrPrelevePO.toFixed(2),
      totalMtBrutTraitSalaireSTG:
        generalData.totalMtBrutTraitSalaireSTG.toFixed(2),
      totalMtBrutIndemnitesSTG: generalData.totalMtBrutIndemnitesSTG.toFixed(2),
      totalMtRetenuesSTG: generalData.totalMtRetenuesSTG.toFixed(2),
      totalMtRevenuNetImpSTG: generalData.totalMtRevenuNetImpSTG.toFixed(2),
      totalSommePayeRTS: generalData.totalSommePayeRTS.toFixed(2),
      totalmtAnuuelRevenuSalarial:
        generalData.totalmtAnuuelRevenuSalarial.toFixed(2),
      totalmtAbondement: generalData.totalmtAbondement.toFixed(2),
      montantPermanent: generalData.montantPermanent.toFixed(2),
      montantOccasionnel: generalData.montantOccasionnel.toFixed(2),
      montantStagiaire: generalData.montantStagiaire.toFixed(2),
      referenceDeclaration: generalData.referenceDeclaration,
    },
  };
  if (permanents.length > 0) {
    xmlData.TraitementEtSalaire.listPersonnelPermanent = {
      PersonnelPermanent: permanents.map((v) => ({
        nom: v.nom.trim(), // Nettoyage du texte
        prenom: v.prenom.trim(), // Nettoyage du texte
        adressePersonnelle: v.adressePersonnelle.trim(), // Nettoyage du texte
        numCNI: v.numCNI, // Nettoyage du texte
        numCE: v.numCE, // Nettoyage du texte
        numPPR: v.numPPR, // Nettoyage du texte
        numCNSS: v.numCNSS, // Nettoyage du texte
        ifu: v.ifu, // Nettoyage du texte
        salaireBaseAnnuel: v.salaireBaseAnnuel.toFixed(2), // Nettoyage du texte
        mtBrutTraitementSalaire: v.mtBrutTraitementSalaire.toFixed(2),
        periode: v.periode,
        mtExonere: v.mtExonere.toFixed(2),
        mtEcheances: v.mtEcheances.toFixed(2),
        nbrReductions: v.nbrReductions.toFixed(2),
        mtIndemnite: v.mtIndemnite.toFixed(2),
        mtAvantages: v.mtAvantages.toFixed(2),
        mtRevenuBrutImposable: v.mtRevenuBrutImposable.toFixed(2),
        mtFraisProfess: v.mtFraisProfess.toFixed(2),
        mtRevenuNetImposable: v.mtRevenuNetImposable.toFixed(2),
        mtTotalDeduction: v.mtTotalDeduction.toFixed(2),
        irPreleve: v.irPreleve.toFixed(2),
        casSportif: v.casSportif,
        numMatricule: v.numMatricule,
        datePermis: v.datePermis,
        dateAutorisation: v.dateAutorisation,
        refSituationFamiliale: {
          code: v.refSituationFamiliale,
        },
        refTaux: {
          code: v.refTaux,
        },
        listElementsExonere: {
          ElementExonerePP: v.elementsexo.map((v) => ({
            montantExonere: v.montantExonere.toFixed(2),
            refNatureElementExonere: {
              code: v.refNatureElementExonere,
            },
          })),
        },
      })),
    };
  }
  if (occasionnels.length > 0) {
    xmlData.TraitementEtSalaire.listPersonnelOccasionnel = {
      PersonnelOccasionnel: occasionnels.map((v) => ({
        nom: v.nom.trim(),
        prenom: v.prenom.trim(), // Nettoyage du texte
        adressePersonnelle: v.adressePersonnelle.trim(),
        numCNI: v.numCNI, // Nettoyage du texte
        numCE: v.numCE, // Nettoyage du texte
        ifu: v.ifu,
        mtBrutSommes: v.mtBrutSommes.toFixed(2),
        irPreleve: v.irPreleve.toFixed(2),
        profession: v.profession.trim(),
      })),
    };
  }

  if (virements.length > 0) {
    xmlData.TraitementEtSalaire.listVersements = {
      VersementTraitementSalaire: virements.map((v) => ({
        mois: v.mois,
        totalVersement: v.totalVersement.toFixed(2),
        dateDerniereVersment: v.dateDerniereVersment,
        listDetailPaiement: {
          DetailPaiementTraitementSalaire: {
            reference: v.reference,
            totalVerse: v.totalVerse.toFixed(2),
            principal: v.principal.toFixed(2),
            penalite: v.penalite.toFixed(2),
            majorations: v.majorations.toFixed(2),
            dateVersement: v.dateVersement,
            refMoyenPaiement: {
              code: v.refMoyenPaiement,
            },
            numQuittance: v.numQuittance,
          },
        },
      })),
    };
  }
  const builder = new xml2js.Builder({
    headless: false,
    renderOpts: { pretty: true },
  });
  const xmlContent = builder.buildObject(xmlData);
  const uuid = crypto.randomUUID();
  const fileName = `IR_CSSBR_${uuid}.xml`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFile(filePath, xmlContent, (err) => {
    if (err) {
      alert("❌ Erreur lors de la génération du fichier XML :", err);
    } else {
      logger.info(`Fichier XML généré avec succès: ${filePath}`);
      alert(`✅ Fichier XML généré avec succès : ${filePath}`);
    }
  });
}
// Écouter l'événement 'file-opened' envoyé depuis main.js
document.getElementById("convertButtonType1").addEventListener("click", () => {
  ipcRenderer.on("file-opened", (event, filePath) => {
    alert("Fichier ouvert: " + filePath); // Afficher une alerte pour confirmer que le fichier a été ouvert
    readCSV(filePath, (data) => {
      const outputDir = path.dirname(filePath);
      generateXML(data, outputDir);
    });
  });
  // console.log('Convert button clicked'); // Log pour débogage
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
    // alert('Fichier ouvert: ' + filetrt);
    // Passer les données CSV lues pour traitement
    readCSV(filetrt, (data) => {
      //  const outputDir = __dirname + '/outdeclarations/';
      const outputDir = "d:/dectva/out/";
      generateXML(data, outputDir);
    });
  };
  reader.readAsText(file);
});
