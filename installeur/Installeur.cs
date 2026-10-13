// Petit installeur à envoyer aux testeurs : il télécharge la DERNIÈRE version du jeu publiée sur GitHub
// et lance son installation. Pas besoin de le renvoyer à chaque mise à jour.
// Compilé avec le csc de .NET Framework 4 (présent sur tous les Windows 10/11) : npm run installeur
// Option --test [url] : télécharge seulement (sans installer) et écrit le résultat dans %TEMP%\ILostMyJobAgain-Installeur-test.txt
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

[assembly: AssemblyTitle("I Lost My Job (Again) - Installeur")]
[assembly: AssemblyProduct("I Lost My Job (Again)")]
[assembly: AssemblyDescription("Télécharge et installe la dernière version du jeu depuis GitHub")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class Installeur
{
    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    [STAThread]
    static int Main(string[] args)
    {
        // GitHub exige TLS 1.2+. Sur .NET 4.7+ (« SystemDefault » = 0), Windows choisit déjà le bon protocole :
        // forcer TLS 1.3 à la main coupe la connexion. On n'ajoute TLS 1.2 que sur les vieux .NET.
        if (ServicePointManager.SecurityProtocol != (SecurityProtocolType)0)
            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
        try { SetProcessDPIAware(); } catch { }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        bool test = args.Length > 0 && args[0] == "--test";
        var form = new InstallForm(test, test && args.Length > 1 ? args[1] : null);
        Application.Run(form);
        return form.ExitCode;
    }
}

class InstallForm : Form
{
    const string SetupUrl = "https://github.com/schl-dev/i-lost-my-job-again/releases/latest/download/ILostMyJobAgain-Setup.exe";
    const string ReleasesPage = "https://github.com/schl-dev/i-lost-my-job-again/releases/latest";

    public int ExitCode = 1;
    readonly bool testOnly;
    readonly string url;
    readonly Label status = new Label();
    readonly ProgressBar bar = new ProgressBar();
    readonly Button cancel = new Button();
    readonly string target = Path.Combine(Path.GetTempPath(), "ILostMyJobAgain-Setup-" + DateTime.Now.Ticks + ".exe");
    WebClient client;

    public InstallForm(bool testOnly, string testUrl)
    {
        this.testOnly = testOnly;
        url = testUrl ?? SetupUrl;
        Text = "I Lost My Job (Again)";
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = true;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 9.5f);
        AutoScaleMode = AutoScaleMode.Dpi;
        ClientSize = new Size(460, 168);
        BackColor = Color.FromArgb(127, 211, 232);

        var title = new Label {
            Text = "Installation de I Lost My Job (Again)",
            Font = new Font("Segoe UI", 13f, FontStyle.Bold),
            ForeColor = Color.FromArgb(30, 42, 74),
            AutoSize = false, Location = new Point(20, 16), Size = new Size(420, 30)
        };
        status.Text = "Recherche de la dernière version sur GitHub…";
        status.ForeColor = Color.FromArgb(30, 42, 74);
        status.AutoSize = false;
        status.Location = new Point(20, 54);
        status.Size = new Size(420, 22);
        bar.Location = new Point(20, 82);
        bar.Size = new Size(420, 22);
        bar.Style = ProgressBarStyle.Marquee;
        cancel.Text = "Annuler";
        cancel.Size = new Size(96, 30);
        cancel.Location = new Point(344, 122);
        cancel.Click += delegate { if (client != null) client.CancelAsync(); else Close(); };
        Controls.AddRange(new Control[] { title, status, bar, cancel });
        Shown += delegate { StartDownload(); };
        FormClosing += delegate { if (client != null && client.IsBusy) client.CancelAsync(); };
    }

    void StartDownload()
    {
        client = new WebClient();
        client.Headers.Add("User-Agent", "ILostMyJobAgain-Installeur");
        client.DownloadProgressChanged += (s, e) => {
            if (e.TotalBytesToReceive <= 0) return;
            if (bar.Style != ProgressBarStyle.Continuous) bar.Style = ProgressBarStyle.Continuous;
            bar.Value = Math.Min(100, e.ProgressPercentage);
            status.Text = string.Format("Téléchargement de la dernière version… {0} % ({1:0.0} Mo / {2:0.0} Mo)",
                e.ProgressPercentage, e.BytesReceived / 1048576.0, e.TotalBytesToReceive / 1048576.0);
        };
        client.DownloadFileCompleted += OnDownloaded;
        client.DownloadFileAsync(new Uri(url), target);
    }

    void OnDownloaded(object sender, AsyncCompletedEventArgs e)
    {
        client.Dispose();
        client = null;
        if (e.Cancelled) { TryDelete(); Close(); return; }
        long size = File.Exists(target) ? new FileInfo(target).Length : 0;
        if (e.Error != null || size < 1048576)
        {
            TryDelete();
            string reason = e.Error != null ? e.Error.Message : "fichier incomplet";
            if (testOnly) { WriteTestResult("ERREUR " + reason); Close(); return; }
            var answer = MessageBox.Show(this,
                "Impossible de télécharger le jeu (" + reason + ").\n\nVérifie ta connexion à Internet.\nVeux-tu ouvrir la page de téléchargement sur GitHub ?",
                "I Lost My Job (Again)", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (answer == DialogResult.Yes) { try { Process.Start(ReleasesPage); } catch { } }
            Close();
            return;
        }
        if (testOnly)
        {
            WriteTestResult("OK " + size);
            TryDelete();
            ExitCode = 0;
            Close();
            return;
        }
        status.Text = "Lancement de l'installation…";
        bar.Value = 100;
        try
        {
            // L'installeur du jeu (en un clic) installe puis lance le jeu tout seul.
            Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
            ExitCode = 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, "Impossible de lancer l'installation : " + ex.Message, "I Lost My Job (Again)",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        Close();
    }

    void TryDelete() { try { if (File.Exists(target)) File.Delete(target); } catch { } }

    static void WriteTestResult(string text)
    {
        try { File.WriteAllText(Path.Combine(Path.GetTempPath(), "ILostMyJobAgain-Installeur-test.txt"), text); } catch { }
    }
}
