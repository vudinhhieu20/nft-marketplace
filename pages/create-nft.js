import Image from "next/image";
import { Router } from "next/router";
import { useState } from "react";
import { useRouter } from "next/router";
import { create } from "ipfs-http-client";
import Web3Modal from "web3modal";
import { ethers } from "ethers";

const client = create({ url: "http://127.0.0.1:5001/api/v0" });

import { marketplaceAddress } from "../config";

import NFTMarketplace from "../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json";

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null);
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [checkAuction, setCheckAuction] = useState(false);
  const [buttonText, setButtonText] = useState("Đăng bán sản phẩm");
  const [endTime, setEndTime] = useState(null);

  const router = useRouter();
  const [formInput, updateFormInput] = useState({
    price: "",
    name: "",
    description: "",
  });
  async function onChange(e) {
    /* upload image to IPFS */
    const file = e.target.files[0];
    console.log(file);
    try {
      const added = await client.add(file);

      const url = `http://127.0.0.1:8080/ipfs/${added.path}`;
      console.log(url);
      setFileUrl(url);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }
  async function uploadToIPFS() {
    const { name, description, price } = formInput;
    if (!name || !description || !price || !fileUrl) return;
    /* first, upload metadata to IPFS */
    const data = JSON.stringify({
      name,
      description,
      image: fileUrl,
    });
    try {
      const added = await client.add(data);
      const url = `http://127.0.0.1:8080/ipfs/${added.path}`;
      /* after metadata is uploaded to IPFS, return the URL to use it in the transaction */
      return url;
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }

  async function listNFTForSale() {
    if (
      !formInput.name ||
      !formInput.description ||
      !formInput.price ||
      !fileUrl
    ) {
      alert("Thông tin sản phẩm không được để trống");
      return;
    }
    if (checkAuction && !endTime) {
      alert("Thông tin sản phẩm không được để trống");
      return;
    }
    const url = await uploadToIPFS();
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* create the NFT */
    const price = ethers.utils.parseUnits(formInput.price, "ether");
    let contract = new ethers.Contract(
      marketplaceAddress,
      NFTMarketplace.abi,
      signer
    );
    let listingPrice = await contract.getListingPrice();
    listingPrice = listingPrice.toString();
    let transaction = await contract.createToken(
      url,
      price,
      checkAuction,
      endTime / 1000,
      {
        value: listingPrice,
      }
    );
    await transaction.wait();

    router.push("/");
  }

  const createAuction = (e) => {
    console.log(e.target.checked);
    setOpen(e.target.checked);

    if (e.target.checked) {
      setButtonText("Đấu giá sản phẩm");
      setCheckAuction(true);
    } else {
      setButtonText("Đăng bán sản phẩm");
      setCheckAuction(false);
    }
  };
  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, name: e.target.value })
          }
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, description: e.target.value })
          }
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={(e) =>
            updateFormInput({ ...formInput, price: e.target.value })
          }
        />
        <input type="file" name="Asset" className="my-4" onChange={onChange} />
        {fileUrl && (
          <img
            className="rounded mt-4"
            width="350"
            height="300"
            src={fileUrl}
            alt="preview image"
          />
        )}

        <div class="flex items-center">
          <input
            // checked
            id="checked-auction"
            type="checkbox"
            value=""
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            onClick={(e) => createAuction(e)}
          ></input>
          <label
            for="checked-auction"
            class="ml-2 text-base font-medium text-gray-900 dark:text-gray-300"
          >
            Đấu giá sản phẩm
          </label>
        </div>

        {open === true && (
          <>
            <div class="m-2"></div>
            <br />

            <p class="text-gray-400">Thời điểm kết thúc đấu giá </p>
            <input
              type="datetime-local"
              className="mt-2 border rounded p-4"
              placeholder={"Thời gian kết thúc"}
              onChange={(e) => {
                const date = new Date(e.target.value);
                console.log(date.getTime());
                setEndTime(date.getTime());
              }}
            />
            <div></div>
            <br />
            {/* <input
              className="mt-2 border rounded p-4"
              placeholder={"Giá khởi điểm"}
            /> */}
            <p class="text-gray-400">
              {" "}
              Khi đấu giá, giá khởi điểm của sản phẩm được đặt bằng giá tiền
            </p>
          </>
        )}

        <button
          onClick={listNFTForSale}
          className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
