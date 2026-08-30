package com.spadas.ai.scanner

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.spadas.ai.R
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * MLKitScannerActivity: Native High-Speed 60 FPS Barcode & Item Scanner
 * Uses CameraX + Google ML Kit for on-device hardware-accelerated detection,
 * instant haptic confirmation, and hardware torch control.
 */
class MLKitScannerActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var btnTorch: ImageButton
    private lateinit var btnClose: ImageButton
    private lateinit var txtStatus: TextView

    private var camera: Camera? = null
    private var isTorchOn = false
    private var isScanningActive = true
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var barcodeScanner: BarcodeScanner

    companion object {
        private const val CAMERA_REQ_CODE = 2001
        const val EXTRA_SCANNED_BARCODE = "extra_scanned_barcode"
        const val EXTRA_SCANNED_FORMAT = "extra_scanned_format"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_mlkit_scanner)

        previewView = findViewById(R.id.preview_view)
        btnTorch = findViewById(R.id.btn_torch)
        btnClose = findViewById(R.id.btn_close)
        txtStatus = findViewById(R.id.txt_scanner_status)

        cameraExecutor = Executors.newSingleThreadExecutor()

        // Configure ML Kit for common retail & collectible barcode formats
        val options = BarcodeScannerOptions.Builder()
            .setBarcodeFormats(
                Barcode.FORMAT_UPC_A,
                Barcode.FORMAT_UPC_E,
                Barcode.FORMAT_EAN_13,
                Barcode.FORMAT_EAN_8,
                Barcode.FORMAT_CODE_128,
                Barcode.FORMAT_CODE_39,
                Barcode.FORMAT_QR_CODE,
                Barcode.FORMAT_DATA_MATRIX
            )
            .build()
        barcodeScanner = BarcodeScanning.getClient(options)

        btnClose.setOnClickListener { finish() }

        btnTorch.setOnClickListener {
            toggleTorch()
        }

        if (hasCameraPermission()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_REQ_CODE
            )
        }
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun toggleTorch() {
        val cam = camera ?: return
        if (cam.cameraInfo.hasFlashUnit()) {
            isTorchOn = !isTorchOn
            cam.cameraControl.enableTorch(isTorchOn)
            btnTorch.setImageResource(
                if (isTorchOn) R.drawable.ic_torch_on else R.drawable.ic_torch_off
            )
        } else {
            Toast.makeText(this, "Flashlight unavailable on this camera", Toast.LENGTH_SHORT).show()
        }
    }

    private fun triggerHapticFeedback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator?.vibrate(
                VibrationEffect.createWaveform(longArrayOf(0, 40, 30, 40), -1)
            )
        } else {
            @Suppress("DEPRECATION")
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(50)
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor, BarcodeAnalyzer { barcode ->
                        if (isScanningActive) {
                            isScanningActive = false
                            runOnUiThread {
                                onBarcodeDetected(barcode)
                            }
                        }
                    })
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                camera = cameraProvider.bindToLifecycle(
                    this,
                    cameraSelector,
                    preview,
                    imageAnalyzer
                )
            } catch (exc: Exception) {
                Toast.makeText(this, "Failed to start camera: ${exc.message}", Toast.LENGTH_SHORT).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun onBarcodeDetected(barcode: Barcode) {
        val rawValue = barcode.rawValue ?: return
        triggerHapticFeedback()

        // Return result back to calling Activity / TWA
        val resultIntent = Intent().apply {
            putExtra(EXTRA_SCANNED_BARCODE, rawValue)
            putExtra(EXTRA_SCANNED_FORMAT, barcode.format)
        }
        setResult(RESULT_OK, resultIntent)

        // Also launch directly into Spadas Web app if opened standalone
        val webIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("https://spadas-tech.vercel.app/lens?barcode=$rawValue")
        ).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(webIntent)
        finish()
    }

    private inner class BarcodeAnalyzer(private val onBarcodeFound: (Barcode) -> Unit) :
        ImageAnalysis.Analyzer {

        @OptIn(ExperimentalGetImage::class)
        override fun analyze(imageProxy: ImageProxy) {
            val mediaImage = imageProxy.image
            if (mediaImage != null) {
                val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                barcodeScanner.process(image)
                    .addOnSuccessListener { barcodes ->
                        val first = barcodes.firstOrNull()
                        if (first != null && !first.rawValue.isNullOrBlank()) {
                            onBarcodeFound(first)
                        }
                    }
                    .addOnCompleteListener {
                        imageProxy.close()
                    }
            } else {
                imageProxy.close()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_REQ_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera()
            } else {
                Toast.makeText(this, "Camera permission is required to scan products.", Toast.LENGTH_LONG).show()
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}
